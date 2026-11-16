import { test } from "node:test";
import assert from "node:assert/strict";
import { RateCache, RATES_CACHE_KEY } from "../lib/currency/cache";
import { clasificarCotizacion } from "../lib/currency/freshness";
import { RateService } from "../lib/currency/service";
import type {
  ExchangeRateProvider,
  ExchangeRateQuote,
} from "../lib/currency/rates";

const AHORA = new Date("2026-11-16T12:00:00Z"); // lunes

function quote(over: Partial<ExchangeRateQuote>): ExchangeRateQuote {
  return {
    from: "USD",
    to: "BOB",
    rate: 6.9,
    provider: "mock",
    providerName: "Mock",
    fetchedAt: "2026-11-16T10:00:00Z",
    publishedAt: "2026-11-16",
    rateType: "mid",
    status: "valid",
    ...over,
  };
}

class ScriptedProvider implements ExchangeRateProvider {
  readonly id = "mock";
  readonly name = "Mock";
  constructor(private readonly rates: Record<string, ExchangeRateQuote | null>) {}
  async getRate(from: string, to: string): Promise<ExchangeRateQuote | null> {
    return this.rates[`${from}|${to}`] ?? null;
  }
}

function servicio(provider: ExchangeRateProvider): RateService {
  return new RateService(provider, new RateCache(), undefined, () => AHORA);
}

// ——— 1. Compatibilidad de fuentes en tasas cruzadas ———

test("cruzada con fuentes subyacentes iguales conserva trazabilidad", async () => {
  const provider = new ScriptedProvider({
    "EUR|USD": quote({ from: "EUR", to: "USD", rate: 1.1, underlyingProviders: ["BCE"] }),
    "USD|BOB": quote({ from: "USD", to: "BOB", rate: 6.9, underlyingProviders: ["BCE"] }),
  });
  const r = await servicio(provider).quote("EUR", "BOB");
  assert.ok(r.quote);
  assert.equal(r.quote.viaCurrency, "USD");
  assert.deepEqual(r.quote.underlyingProviders, ["BCE"]);
  assert.deepEqual(r.quote.legs?.[0].underlyingProviders, ["BCE"]);
  assert.deepEqual(r.quote.legs?.[1].underlyingProviders, ["BCE"]);
});

test("cruzada con fuentes subyacentes distintas registra ambas por pata", async () => {
  // Mismo caso que el anterior con fuentes distintas: se permite, pero
  // cada pata conserva su fuente y el detalle las muestra por separado.
  const provider = new ScriptedProvider({
    "EUR|USD": quote({ from: "EUR", to: "USD", rate: 1.1, underlyingProviders: ["ECB"] }),
    "USD|BOB": quote({ from: "USD", to: "BOB", rate: 6.9, underlyingProviders: ["BCBO"] }),
  });
  const r = await servicio(provider).quote("EUR", "BOB");
  assert.ok(r.quote);
  assert.equal(r.quote.provider, "mock"); // agregador común, no fuente única
  assert.deepEqual(r.quote.legs?.[0].underlyingProviders, ["ECB"]);
  assert.deepEqual(r.quote.legs?.[1].underlyingProviders, ["BCBO"]);
  assert.equal(r.freshness, "vigente");
});

test("cruzada sin metadatos de fuentes no inventa orígenes", async () => {
  const provider = new ScriptedProvider({
    "EUR|USD": quote({ from: "EUR", to: "USD", rate: 1.1 }),
    "USD|BOB": quote({ from: "USD", to: "BOB", rate: 6.9 }),
  });
  const r = await servicio(provider).quote("EUR", "BOB");
  assert.ok(r.quote);
  assert.equal(r.quote.underlyingProviders, undefined);
  assert.equal(r.quote.legs?.[0].underlyingProviders, undefined);
  assert.equal(r.quote.legs?.[1].underlyingProviders, undefined);
});

test("cruzada rechaza tipos de tasa incompatibles", async () => {
  const provider = new ScriptedProvider({
    "EUR|USD": quote({ from: "EUR", to: "USD", rate: 1.1, rateType: "mid" }),
    "USD|BOB": quote({ from: "USD", to: "BOB", rate: 6.9, rateType: "buy" }),
  });
  const r = await servicio(provider).quote("EUR", "BOB");
  assert.equal(r.quote, null);
  assert.equal(r.freshness, "no_disponible");
});

test("cruzada rechaza patas de proveedores distintos", async () => {
  const provider = new ScriptedProvider({
    "EUR|USD": quote({ from: "EUR", to: "USD", rate: 1.1, provider: "mock" }),
    "USD|BOB": quote({ from: "USD", to: "BOB", rate: 6.9, provider: "otro" }),
  });
  const r = await servicio(provider).quote("EUR", "BOB");
  assert.equal(r.quote, null);
  assert.equal(r.freshness, "no_disponible");
});

// ——— 2. Validación defensiva del caché ———

function instalarStorage(): Map<string, string> {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
  (globalThis as Record<string, unknown>).localStorage = storage;
  return map;
}

function conStorage(fn: () => void) {
  const map = instalarStorage();
  try {
    fn();
  } finally {
    delete (globalThis as Record<string, unknown>).localStorage;
    void map;
  }
}

function seedEntry(over: Record<string, unknown>) {
  const storage = (globalThis as unknown as { localStorage: Storage }).localStorage;
  storage.setItem(
    RATES_CACHE_KEY,
    JSON.stringify({
      "USD|BOB|": {
        quote: null,
        savedAt: new Date().toISOString(),
        ttlMs: 3600000,
        ...over,
      },
    }),
  );
}

test("caché: JSON corrupto se descarta sin errores", () => {
  conStorage(() => {
    const storage = (globalThis as unknown as { localStorage: Storage }).localStorage;
    storage.setItem(RATES_CACHE_KEY, "{esto no es json");
    const cache = new RateCache();
    assert.equal(cache.get("USD|BOB|"), null);
  });
});

test("caché: estructura inesperada se descarta sin errores", () => {
  conStorage(() => {
    const storage = (globalThis as unknown as { localStorage: Storage }).localStorage;
    for (const raw of ["[1,2,3]", "\"texto\"", "42", "null"]) {
      storage.setItem(RATES_CACHE_KEY, raw);
      assert.equal(new RateCache().get("USD|BOB|"), null, raw);
    }
  });
});

test("caché: cotización con propiedades ausentes o inválidas se descarta", () => {
  conStorage(() => {
    const casos: Array<Record<string, unknown>> = [
      { quote: { from: "USD" } }, // casi todo ausente
      { quote: quote({ rate: -6.9 }) },
      { quote: quote({ rate: 0 }) },
      { quote: quote({ from: "" }) },
      { quote: quote({ fetchedAt: "ayer" }) },
      { quote: quote({ publishedAt: "no-es-fecha" }) },
      { quote: quote({ status: "fresh" as ExchangeRateQuote["status"] }) },
      { quote: quote({ rateType: "inventado" as ExchangeRateQuote["rateType"] }) },
      { quote: quote({ provider: "" }) },
      { quote: quote({ providerName: "" }) },
      { quote: quote({ underlyingProviders: "BCBO" as unknown as string[] }) },
      { quote: { ...quote({}), legs: [{ from: "USD" }] } },
    ];
    for (const over of casos) {
      seedEntry(over);
      assert.equal(
        new RateCache().get("USD|BOB|")?.quote ?? null,
        null,
        JSON.stringify(over).slice(0, 80),
      );
    }
  });
});

test("caché: savedAt inválido o ttlMs inválido descartan la entrada", () => {
  conStorage(() => {
    for (const over of [
      { savedAt: "ayer" },
      { savedAt: 12345 },
      { ttlMs: 0 },
      { ttlMs: -1000 },
      { ttlMs: "600000" },
    ]) {
      seedEntry(over);
      assert.equal(new RateCache().get("USD|BOB|"), null, JSON.stringify(over));
    }
  });
});

test("caché: entrada negativa válida se conserva; inválida no se cachea", () => {
  conStorage(() => {
    seedEntry({ quote: null });
    const cache = new RateCache();
    const entry = cache.get("USD|BOB|");
    assert.ok(entry);
    assert.equal(entry.quote, null);
    // set() con una cotización inválida la convierte en negativa.
    cache.set("EUR|USD|", { from: "EUR" } as unknown as ExchangeRateQuote);
    assert.equal(cache.get("EUR|USD|")?.quote, null);
  });
});

test("caché: la entrada válida expira según su TTL", () => {
  let ahora = Date.parse("2026-11-16T10:00:00Z");
  const cache = new RateCache(RATES_CACHE_KEY, () => ahora);
  cache.set("USD|BOB|", quote({}));
  assert.ok(cache.get("USD|BOB|"));
  ahora += 6 * 60 * 60 * 1000 + 1; // justo después del TTL positivo
  assert.equal(cache.get("USD|BOB|"), null);
  // Negativa: TTL de 10 min.
  cache.set("EUR|USD|", null);
  assert.ok(cache.get("EUR|USD|"));
  ahora += 10 * 60 * 1000 + 1;
  assert.equal(cache.get("EUR|USD|"), null);
});

// ——— 3. Claridad de la vigencia (justificación de la política) ———

test("vigencia: ventana 2-4 días es anterior_vigente, fuera es desactualizada", () => {
  const casos: Array<[string, string]> = [
    ["2026-11-15", "vigente"], // 1 día
    ["2026-11-14", "anterior_vigente"], // 2 días
    ["2026-11-12", "anterior_vigente"], // 4 días
    ["2026-11-11", "desactualizada"], // 5 días
    ["2026-11-17", "desactualizada"], // fecha futura
  ];
  for (const [publishedAt, esperado] of casos) {
    assert.equal(
      clasificarCotizacion(quote({ publishedAt }), AHORA),
      esperado,
      publishedAt,
    );
  }
  // Un estado expired nunca es usable aunque la fecha sea reciente.
  assert.equal(
    clasificarCotizacion(quote({ status: "expired" }), AHORA),
    "desactualizada",
  );
});
