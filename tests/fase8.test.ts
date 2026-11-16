import { test } from "node:test";
import assert from "node:assert/strict";
import { isCurrencyCode } from "../lib/currency/catalog";
import { multiplyDecimals } from "../lib/currency/decimal";
import { RateCache } from "../lib/currency/cache";
import { clasificarCotizacion, cotizacionUsable } from "../lib/currency/freshness";
import { FrankfurterRateProvider, type FetchLike } from "../lib/currency/frankfurter";
import { refrescarPendientes } from "../lib/currency/refresh";
import { RateService } from "../lib/currency/service";
import {
  buildConversionFields,
  UnavailableRateProvider,
  type ExchangeRateProvider,
  type ExchangeRateQuote,
} from "../lib/currency/rates";
import { migrateData } from "../lib/migration";
import { gananciaNeta, montoEnBase } from "../lib/finance";
import type { Transaction } from "../lib/types";

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

/** Proveedor con respuestas guionizadas por par "FROM|TO". */
class ScriptedProvider implements ExchangeRateProvider {
  readonly id = "mock";
  readonly name = "Mock";
  calls: string[] = [];
  constructor(private readonly rates: Record<string, ExchangeRateQuote | null>) {}
  async getRate(from: string, to: string): Promise<ExchangeRateQuote | null> {
    this.calls.push(`${from}|${to}`);
    return this.rates[`${from}|${to}`] ?? null;
  }
}

function servicio(provider: ExchangeRateProvider): RateService {
  return new RateService(
    provider,
    new RateCache(),
    undefined,
    () => AHORA,
  );
}

function tx(parcial: Partial<Transaction>): Transaction {
  return {
    id: parcial.id ?? "t1",
    tipo: parcial.tipo ?? "ingreso",
    monto: parcial.monto ?? 0,
    categoria: parcial.categoria ?? "Ventas",
    descripcion: parcial.descripcion ?? "demo",
    fecha: parcial.fecha ?? "2026-11-01",
    moneda: parcial.moneda ?? "BOB",
    ...parcial,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// ——— FrankfurterRateProvider (escenarios 1-5) ———

test("escenario 1: consulta exitosa mapea cotización con fuente, fecha y tipo", async () => {
  const urls: string[] = [];
  const fetchImpl: FetchLike = async (url) => {
    urls.push(url);
    return jsonResponse({
      date: "2026-11-16",
      base: "USD",
      quote: "BOB",
      rate: 11.6766,
      providers: [{ key: "BCBO", rate: 11.67 }],
    });
  };
  const provider = new FrankfurterRateProvider(fetchImpl, "https://api.test", 1000, 0);
  const q = await provider.getRate("USD", "BOB");
  assert.ok(q);
  assert.equal(q.rate, 11.6766);
  assert.equal(q.provider, "frankfurter");
  assert.equal(q.rateType, "mid");
  assert.equal(q.publishedAt, "2026-11-16");
  assert.deepEqual(q.underlyingProviders, ["BCBO"]);
  assert.equal(q.status, "valid");
  assert.ok(urls[0].includes("/v2/rate/USD/BOB"));
  assert.ok(urls[0].includes("expand=providers"));
});

test("escenario 2: respuesta sin cobertura devuelve null", async () => {
  const fetchImpl: FetchLike = async () =>
    jsonResponse({ status: 422, message: "invalid currency: XYZ" }, 422);
  const provider = new FrankfurterRateProvider(fetchImpl, "https://api.test", 1000, 0);
  assert.equal(await provider.getRate("USD", "XYZ"), null);
});

test("escenario 3: proveedor no disponible devuelve null y no hay equivalencia", async () => {
  const service = servicio(new UnavailableRateProvider());
  const r = await service.quote("USD", "BOB");
  assert.equal(r.quote, null);
  assert.equal(r.freshness, "no_disponible");
  assert.deepEqual(buildConversionFields("USD", "BOB", 100, r.quote), {});
});

test("escenario 4: timeout del proveedor devuelve null sin colgar", async () => {
  const fetchImpl: FetchLike = (_url, init) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () =>
        reject(new DOMException("The operation timed out", "TimeoutError")),
      );
    });
  const provider = new FrankfurterRateProvider(fetchImpl, "https://api.test", 20, 0);
  const t0 = Date.now();
  assert.equal(await provider.getRate("USD", "BOB"), null);
  assert.ok(Date.now() - t0 < 2000);
});

test("escenario 5: respuesta malformada devuelve null", async () => {
  const malformadas = [
    { date: "2026-11-16", base: "USD", quote: "BOB", rate: "abc" },
    { date: "ayer", base: "USD", quote: "BOB", rate: 6.9 },
    { date: "2026-11-16", base: "EUR", quote: "BOB", rate: 6.9 }, // par distinto
    { date: "2026-11-16", base: "USD", quote: "BOB", rate: -6.9 },
    null,
  ];
  for (const body of malformadas) {
    const fetchImpl: FetchLike = async () => jsonResponse(body);
    const provider = new FrankfurterRateProvider(fetchImpl, "https://api.test", 1000, 0);
    assert.equal(await provider.getRate("USD", "BOB"), null, JSON.stringify(body));
  }
});

// ——— Frescura (escenarios 6, 7) ———

test("escenario 6: cotización desactualizada no es usable", async () => {
  const vieja = quote({ publishedAt: "2026-11-01" });
  assert.equal(clasificarCotizacion(vieja, AHORA), "desactualizada");
  const provider = new ScriptedProvider({ "USD|BOB": vieja });
  const r = await servicio(provider).quote("USD", "BOB");
  assert.equal(r.freshness, "desactualizada");
  assert.equal(r.quote?.status, "expired");
  assert.deepEqual(buildConversionFields("USD", "BOB", 100, r.quote), {});
});

test("escenario 7: cotización de fin de semana sigue vigente el lunes", async () => {
  // Viernes 13 → lunes 16: 3 días, último valor publicado del día hábil.
  const viernes = quote({ publishedAt: "2026-11-13" });
  assert.equal(clasificarCotizacion(viernes, AHORA), "anterior_vigente");
  assert.ok(cotizacionUsable("anterior_vigente"));
  const provider = new ScriptedProvider({ "USD|BOB": viernes });
  const r = await servicio(provider).quote("USD", "BOB");
  assert.equal(r.quote?.status, "valid");
  const fields = buildConversionFields("USD", "BOB", 100, r.quote);
  assert.equal(fields.baseAmount, 690);
});

// ——— Conversión directa y cruzada (escenarios 8, 9, 10) ———

test("escenario 8: conversión directa con decimales de la moneda destino", () => {
  const q = quote({ from: "USD", to: "BOB", rate: 6.9 });
  const fields = buildConversionFields("USD", "BOB", 100, q);
  assert.equal(fields.baseAmount, 690);
  assert.equal(fields.exchangeRate, 6.9);
  assert.equal(fields.exchangeRateSource, "mock");
  assert.equal(fields.exchangeRateType, "mid");
});

test("escenario 9: tasa cruzada con trazabilidad cuando no hay directa", async () => {
  const provider = new ScriptedProvider({
    "EUR|USD": quote({ from: "EUR", to: "USD", rate: 1.1 }),
    "USD|BOB": quote({ from: "USD", to: "BOB", rate: 6.9 }),
  });
  const r = await servicio(provider).quote("EUR", "BOB");
  assert.ok(r.quote);
  assert.equal(r.quote.viaCurrency, "USD");
  assert.equal(r.quote.legs?.length, 2);
  assert.equal(r.quote.legs?.[0].from, "EUR");
  assert.equal(r.quote.legs?.[1].to, "BOB");
  assert.equal(r.quote.rate, 7.59); // 1.1 × 6.9 exacto
  assert.equal(r.freshness, "vigente");
});

test("escenario 9b: no se cruza con fechas o tipos incompatibles", async () => {
  const provider = new ScriptedProvider({
    "EUR|USD": quote({ from: "EUR", to: "USD", rate: 1.1, publishedAt: "2026-11-16" }),
    "USD|BOB": quote({ from: "USD", to: "BOB", rate: 6.9, publishedAt: "2026-11-13" }),
  });
  const r = await servicio(provider).quote("EUR", "BOB");
  assert.equal(r.quote, null);
  assert.equal(r.freshness, "no_disponible");
});

test("escenario 10: decimales ISO distintos (JPY 0, KWD 3) se respetan", () => {
  const jpy = buildConversionFields("USD", "JPY", 100, quote({ from: "USD", to: "JPY", rate: 150.4 }));
  assert.equal(jpy.baseAmount, 15040);
  const kwd = buildConversionFields("USD", "KWD", 100, quote({ from: "USD", to: "KWD", rate: 0.3071 }));
  assert.equal(kwd.baseAmount, 30.71);
});

test("multiplicación de tasas sin polvo de punto flotante", () => {
  assert.equal(multiplyDecimals(6.9, 1.1), 7.59);
  assert.equal(multiplyDecimals(0.1, 0.2, 8), 0.02);
});

// ——— Snapshots y pendientes (escenarios 11, 12) ———

test("escenario 11: el refresco no toca snapshots históricos ni datos válidos", async () => {
  const historico = tx({
    id: "h",
    moneda: "USD",
    monto: 100,
    baseAmount: 690,
    baseCurrency: "EUR", // snapshot de otra moneda base: histórico
    exchangeRate: 6.9,
    exchangeRateSource: "mock",
    exchangeRateDate: "2026-01-01T00:00:00Z",
    exchangeRateType: "mid",
    exchangeRatePublishedAt: "2026-01-01",
  });
  const valida = tx({
    id: "v",
    moneda: "USD",
    monto: 100,
    baseAmount: 690,
    baseCurrency: "BOB",
    exchangeRate: 6.9,
  });
  const provider = new ScriptedProvider({ "USD|BOB": quote({}) });
  const res = await refrescarPendientes([historico, valida], "BOB", servicio(provider));
  assert.equal(res.convertidos, 0);
  assert.equal(res.actualizados.length, 0);
  assert.equal(res.transactions[0].exchangeRateDate, "2026-01-01T00:00:00Z");
  assert.equal(res.transactions[0].exchangeRatePublishedAt, "2026-01-01");
  assert.equal(res.pendientes, 1); // solo el histórico en otra base sigue pendiente
});

test("escenario 12: refresco actualiza pendientes sin snapshot y no muta el original", async () => {
  const pendiente = tx({ id: "p", moneda: "USD", monto: 100 });
  const mismaMoneda = tx({ id: "b", moneda: "BOB", monto: 50 });
  const provider = new ScriptedProvider({ "USD|BOB": quote({}) });
  const res = await refrescarPendientes([pendiente, mismaMoneda], "BOB", servicio(provider));
  assert.equal(res.convertidos, 1);
  assert.equal(res.actualizados[0].id, "p");
  assert.equal(res.actualizados[0].baseAmount, 690);
  assert.equal(res.actualizados[0].exchangeRateSource, "mock");
  assert.equal(res.actualizados[0].exchangeRateType, "mid");
  assert.equal(res.actualizados[0].exchangeRatePublishedAt, "2026-11-16");
  assert.equal(res.pendientes, 0);
  // El array original no se muta.
  assert.equal(pendiente.baseAmount, undefined);
});

// ——— Moneda principal y visualización (escenarios 13, 14) ———

test("escenario 13: cambio de moneda principal no recalcula el histórico", () => {
  const data = migrateData({
    profile: { nombreNegocio: "X", nombreUsuario: "Y", moneda: "BOB" },
    transactions: [
      tx({
        id: "t",
        moneda: "USD",
        monto: 100,
        baseAmount: 690,
        baseCurrency: "BOB",
        exchangeRate: 6.9,
        exchangeRateSource: "frankfurter",
        exchangeRateDate: "2026-11-16T10:00:00Z",
        exchangeRatePublishedAt: "2026-11-16",
      }),
    ],
  });
  const cambiado = migrateData({
    ...data,
    profile: { ...data.profile, moneda: "USD" },
  });
  const t = cambiado.transactions[0];
  assert.equal(t.baseAmount, 690); // snapshot histórico intacto
  assert.equal(montoEnBase(t, "USD"), 100); // en USD el importe original es válido
  const g = gananciaNeta(cambiado.transactions, "USD");
  assert.equal(g.ingresos.total, 100);
});

test("escenario 14: cambiar displayCurrency no altera los movimientos", () => {
  const data = migrateData({
    profile: { nombreNegocio: "X", nombreUsuario: "Y", moneda: "BOB" },
    transactions: [tx({ id: "t", moneda: "USD", monto: 100 })],
  });
  const conDisplay = migrateData({
    ...data,
    profile: { ...data.profile, displayCurrency: "EUR" },
  });
  assert.deepEqual(conDisplay.transactions, data.transactions);
});

// ——— Ausencia de cotización (escenario 15) ———

test("escenario 15: sin cotización no se inventa equivalencia", async () => {
  const service = servicio(new ScriptedProvider({}));
  const r = await service.quote("EUR", "JPY");
  assert.equal(r.quote, null);
  assert.equal(r.freshness, "no_disponible");
  assert.deepEqual(buildConversionFields("EUR", "JPY", 100, r.quote), {});
});

// ——— Separación fiat/USDC (escenario 16) ———

test("escenario 16: USDC no es moneda fiat y no se convierte", async () => {
  assert.ok(!isCurrencyCode("USDC"));
  const service = servicio(
    new ScriptedProvider({ "USDC|USD": quote({ from: "USDC", to: "USD", rate: 1 }) }),
  );
  const r = await service.quote("USDC", "USD");
  assert.equal(r.quote, null);
  assert.equal(r.freshness, "no_disponible");
});

// ——— Precisión de totales (escenario 17) ———

test("escenario 17: totales con precisión decimal exacta", () => {
  const txs = [
    tx({ id: "a", tipo: "ingreso", monto: 0.1, moneda: "BOB" }),
    tx({ id: "b", tipo: "ingreso", monto: 0.2, moneda: "BOB" }),
  ];
  assert.equal(gananciaNeta(txs, "BOB").ingresos.total, 0.3);
});

// ——— Fallo de proveedor sin corrupción (escenario 18) ———

test("escenario 18: proveedor que lanza error no corrompe datos", async () => {
  class FailingProvider implements ExchangeRateProvider {
    readonly id = "fail";
    readonly name = "Falla";
    async getRate(): Promise<ExchangeRateQuote | null> {
      throw new Error("red caída");
    }
  }
  const service = servicio(new FailingProvider());
  const r = await service.quote("USD", "BOB");
  assert.equal(r.quote, null);
  assert.equal(r.freshness, "no_disponible");
  const pendiente = tx({ id: "p", moneda: "USD", monto: 100 });
  const res = await refrescarPendientes([pendiente], "BOB", service);
  assert.equal(res.convertidos, 0);
  assert.equal(res.transactions[0].exchangeRate, undefined);
  assert.equal(res.transactions[0].baseAmount, undefined);
});

// ——— Caché ———

test("el caché evita solicitudes repetidas y registra última actualización", async () => {
  const provider = new ScriptedProvider({ "USD|BOB": quote({}) });
  const service = servicio(provider);
  await service.quote("USD", "BOB");
  await service.quote("USD", "BOB");
  assert.equal(provider.calls.length, 1);
  assert.ok(service.ultimaActualizacion());
});
