import { test } from "node:test";
import assert from "node:assert/strict";
import { RateCache, RATES_CACHE_KEY } from "../lib/currency/cache";
import { clasificarCotizacion, cotizacionUsable } from "../lib/currency/freshness";
import { refrescarPendientes } from "../lib/currency/refresh";
import { RateService } from "../lib/currency/service";
import { buildConversionFields } from "../lib/currency/rates";
import type { Transaction } from "../lib/types";
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
  // Un estado unavailable nunca se evalúa por fecha: es no_disponible.
  assert.equal(
    clasificarCotizacion(quote({ status: "unavailable" }), AHORA),
    "no_disponible",
  );
});

// ——— Estados de cotización en el motor ———

test("unavailable con fecha de hoy no se utiliza (directa)", async () => {
  const provider = new ScriptedProvider({
    "USD|BOB": quote({ status: "unavailable", publishedAt: "2026-11-16" }),
  });
  const r = await servicio(provider).quote("USD", "BOB");
  assert.equal(r.quote, null);
  assert.equal(r.freshness, "no_disponible");
});

test("expired con fecha de hoy no se utiliza (directa)", async () => {
  const provider = new ScriptedProvider({
    "USD|BOB": quote({ status: "expired", publishedAt: "2026-11-16" }),
  });
  const r = await servicio(provider).quote("USD", "BOB");
  assert.equal(r.freshness, "desactualizada");
  assert.equal(r.quote?.status, "expired");
  assert.ok(!cotizacionUsable(r.freshness));
  assert.deepEqual(buildConversionFields("USD", "BOB", 100, r.quote), {});
});

test("cruzada con una pata unavailable se rechaza", async () => {
  const provider = new ScriptedProvider({
    "EUR|USD": quote({ from: "EUR", to: "USD", rate: 1.1 }),
    "USD|BOB": quote({ from: "USD", to: "BOB", rate: 6.9, status: "unavailable" }),
  });
  const r = await servicio(provider).quote("EUR", "BOB");
  assert.equal(r.quote, null);
  assert.equal(r.freshness, "no_disponible");
});

test("cruzada con una pata expired se rechaza", async () => {
  const provider = new ScriptedProvider({
    "EUR|USD": quote({ from: "EUR", to: "USD", rate: 1.1 }),
    "USD|BOB": quote({ from: "USD", to: "BOB", rate: 6.9, status: "expired" }),
  });
  const r = await servicio(provider).quote("EUR", "BOB");
  assert.equal(r.quote, null);
  assert.equal(r.freshness, "no_disponible");
});

test("cotización valid y reciente sigue funcionando", async () => {
  const provider = new ScriptedProvider({ "USD|BOB": quote({}) });
  const r = await servicio(provider).quote("USD", "BOB");
  assert.equal(r.quote?.status, "valid");
  assert.equal(r.freshness, "vigente");
  assert.deepEqual(buildConversionFields("USD", "BOB", 100, r.quote), {
    baseAmount: 690,
    baseCurrency: "BOB",
    exchangeRate: 6.9,
    exchangeRateSource: "mock",
    exchangeRateDate: "2026-11-16T10:00:00Z",
    exchangeRateType: "mid",
    exchangeRatePublishedAt: "2026-11-16",
  });
});

test("unavailable no modifica snapshots ni importes de movimientos", async () => {
  const pendiente = {
    id: "p",
    tipo: "ingreso" as const,
    monto: 100,
    categoria: "Ventas",
    descripcion: "demo",
    fecha: "2026-11-01",
    moneda: "USD",
  } satisfies Transaction;
  const provider = new ScriptedProvider({
    "USD|BOB": quote({ status: "unavailable", publishedAt: "2026-11-16" }),
  });
  const res = await refrescarPendientes([pendiente], "BOB", servicio(provider));
  assert.equal(res.convertidos, 0);
  assert.equal(res.actualizados.length, 0);
  assert.equal(res.pendientes, 1);
  assert.equal(res.transactions[0].baseAmount, undefined);
  assert.equal(res.transactions[0].exchangeRate, undefined);
  assert.equal(res.transactions[0].monto, 100);
});
