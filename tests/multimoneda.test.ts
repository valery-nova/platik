import { test } from "node:test";
import assert from "node:assert/strict";
import {
  gananciaNeta,
  montoEnBase,
  serieMensual,
  totalByType,
  totalesPorCategoria,
} from "../lib/finance";
import { migrateData, migrateGoal, migrateProfile } from "../lib/migration";
import {
  getCountry,
  isCountryCode,
  isCurrencyCode,
  suggestedCurrencyForCountry,
} from "../lib/currency/catalog";
import {
  buildConversionFields,
  ManualRateProvider,
  UnavailableRateProvider,
} from "../lib/currency/rates";
import type { PlatikData, Transaction } from "../lib/types";

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

// ——— Catálogo ISO ———

test("catálogo ISO 4217/3166: códigos válidos e inválidos", () => {
  assert.ok(isCurrencyCode("BOB"));
  assert.ok(isCurrencyCode("JPY"));
  assert.ok(!isCurrencyCode("XXX123"));
  assert.ok(isCountryCode("BO"));
  assert.ok(isCountryCode("JP"));
  assert.ok(!isCountryCode("ZZ"));
  assert.equal(getCountry("BO")?.currencies[0], "BOB");
});

// ——— Escenario 1: usuario de Bolivia que selecciona BOB ———

test("escenario 1: Bolivia con BOB conserva BOB", () => {
  const p = migrateProfile({ nombreNegocio: "X", nombreUsuario: "Y", moneda: "BOB", countryCode: "BO" });
  assert.equal(p.moneda, "BOB");
  assert.equal(p.countryCode, "BO");
});

// ——— Escenario 2: usuario de Bolivia que elige USD ———

test("escenario 2: Bolivia que elige USD no es sobrescrito por la sugerencia local", () => {
  const p = migrateProfile({
    nombreNegocio: "X",
    nombreUsuario: "Y",
    moneda: "USD",
    countryCode: "BO",
    currencyPreference: "usd",
  });
  const data = migrateData({ profile: p });
  assert.equal(data.profile.moneda, "USD");
});

// ——— Escenario 3: freelancer de México que selecciona USD ———

test("escenario 3: freelancer de México con USD", () => {
  const p = migrateProfile({
    nombreNegocio: "X",
    nombreUsuario: "Y",
    moneda: "USD",
    countryCode: "MX",
    currencyPreference: "usd",
  });
  assert.equal(migrateData({ profile: p }).profile.moneda, "USD");
});

// ——— Escenario 4: freelancer de México que mantiene MXN ———

test("escenario 4: México sugiere MXN y lo conserva", () => {
  assert.equal(suggestedCurrencyForCountry("MX"), "MXN");
  const p = migrateProfile({ nombreNegocio: "X", nombreUsuario: "Y", moneda: "MXN", countryCode: "MX" });
  assert.equal(migrateData({ profile: p }).profile.moneda, "MXN");
});

// ——— Escenario 5: usuario de otro país con su moneda local ———

test("escenario 5: país con moneda local (Japón → JPY, decimales 0)", () => {
  assert.equal(suggestedCurrencyForCountry("JP"), "JPY");
  const p = migrateProfile({ nombreNegocio: "X", nombreUsuario: "Y", moneda: "JPY", countryCode: "JP" });
  assert.equal(migrateData({ profile: p }).profile.moneda, "JPY");
});

// ——— Escenario 6 y 10: monedas mezcladas sin cotización ———

test("escenario 6/10: ingreso USD y gasto BOB sin tasa válida se excluyen y marcan pendiente", () => {
  const txs = [
    tx({ id: "a", tipo: "ingreso", monto: 100, moneda: "USD", fecha: "2026-11-02" }),
    tx({ id: "b", tipo: "gasto", monto: 50, moneda: "BOB", fecha: "2026-11-03" }),
    tx({ id: "c", tipo: "gasto", monto: 20, moneda: "BOB", fecha: "2026-11-04" }),
  ];
  const g = gananciaNeta(txs, "BOB");
  // El ingreso USD no tiene conversión válida: se excluye y cuenta como pendiente.
  assert.equal(g.ingresos.total, 0);
  assert.equal(g.ingresos.pendientes, 1);
  assert.equal(g.egresos.total, 70);
  assert.equal(g.egresos.pendientes, 0);
  assert.equal(g.pendientes, 1);
  // Nunca se suma USD + BOB directamente.
  assert.notEqual(g.ingresos.total, 150);
});

test("montoEnBase: misma moneda devuelve el importe; sin tasa devuelve null", () => {
  assert.equal(montoEnBase(tx({ monto: 10, moneda: "BOB" }), "BOB"), 10);
  assert.equal(montoEnBase(tx({ monto: 10, moneda: "USD" }), "BOB"), null);
});

// ——— Escenario 7: cambio de moneda de visualización no altera valores ———

test("escenario 7: cambiar displayCurrency no modifica los movimientos", () => {
  const original = migrateData({
    profile: { nombreNegocio: "X", nombreUsuario: "Y", moneda: "BOB" },
    transactions: [tx({ monto: 100, moneda: "BOB", baseAmount: 100, baseCurrency: "BOB", exchangeRate: 1 })],
  });
  const cambiado = migrateData({
    ...original,
    profile: { ...original.profile, displayCurrency: "USD" },
  });
  assert.equal(cambiado.transactions[0].monto, 100);
  assert.equal(cambiado.transactions[0].baseAmount, 100);
  assert.equal(cambiado.transactions[0].exchangeRate, 1);
});

// ——— Escenario 8: cambio de moneda principal no recalcula histórico ———

test("escenario 8: cambiar la moneda principal no recalcula equivalencias históricas", () => {
  const data = migrateData({
    profile: { nombreNegocio: "X", nombreUsuario: "Y", moneda: "BOB" },
    transactions: [
      tx({
        monto: 100,
        moneda: "USD",
        baseAmount: 690,
        baseCurrency: "BOB",
        exchangeRate: 6.9,
        exchangeRateSource: "manual",
        exchangeRateDate: "2026-11-01T00:00:00Z",
      }),
    ],
  });
  // El usuario cambia su moneda principal a USD: la equivalencia histórica en BOB se conserva.
  const cambiado = migrateData({ ...data, profile: { ...data.profile, moneda: "USD" } });
  const t = cambiado.transactions[0];
  assert.equal(t.baseAmount, 690);
  assert.equal(t.baseCurrency, "BOB");
  assert.equal(t.exchangeRate, 6.9);
  // Y en la nueva moneda principal (USD) el importe original es válido sin conversión.
  assert.equal(montoEnBase(t, "USD"), 100);
});

// ——— Escenario 9: usuario existente con datos históricos en BOB ———

test("escenario 9: datos legacy sin moneda se migran a BOB sin duplicar", () => {
  const legacy = {
    transactions: [
      { id: "t1", tipo: "ingreso", monto: 500, categoria: "Ventas", descripcion: "a", fecha: "2026-11-01" },
      { id: "t2", tipo: "gasto", monto: 100, categoria: "Alquiler", descripcion: "b", fecha: "2026-11-02" },
    ],
    goals: [{ id: "g1", nombre: "Meta", montoObjetivo: 1000, ahorroAcumulado: 100, fechaObjetivo: undefined }],
    profile: { nombreNegocio: "Negocio", nombreUsuario: "Ana", moneda: "BOB" },
    distribution: { operacion: 50, reinversion: 30, ahorro: 20 },
  } as unknown as PlatikData;
  const data = migrateData(legacy);
  assert.equal(data.transactions.length, 2);
  assert.equal(data.transactions[0].moneda, "BOB");
  assert.equal(data.goals[0].moneda, "BOB");
  assert.equal(data.profile.moneda, "BOB");
  // Los importes no cambian.
  assert.equal(data.transactions[0].monto, 500);
  assert.equal(data.goals[0].montoObjetivo, 1000);
});

// ——— Escenario 11: metas fiat existentes conservan importe y moneda ———

test("escenario 11: las metas conservan importe y moneda", () => {
  const g = migrateGoal({ id: "g1", nombre: "Viaje", montoObjetivo: 2500, ahorroAcumulado: 300, moneda: "MXN" });
  assert.equal(g.montoObjetivo, 2500);
  assert.equal(g.ahorroAcumulado, 300);
  assert.equal(g.moneda, "MXN");
});

// ——— Escenario 12: ahorro USDC en Stellar separado de metas fiat ———

test("escenario 12: los aportes USDC de Stellar no se mezclan con metas fiat", () => {
  const data = migrateData({
    profile: { nombreNegocio: "X", nombreUsuario: "Y", moneda: "BOB" },
    goals: [migrateGoal({ id: "g1", nombre: "Meta BOB", montoObjetivo: 1000, ahorroAcumulado: 100, moneda: "BOB" })],
    transactions: [],
    aportesStellar: [
      {
        id: "a1",
        goalId: "g1",
        walletOrigen: "GAAAA",
        direccionReceptora: "GBBBB",
        assetCode: "USDC",
        assetIssuer: "GCCCC",
        red: "testnet",
        importe: 5,
        estado: "confirmada",
        createdAt: "2026-11-01T00:00:00Z",
      },
    ],
  } as unknown as PlatikData);
  // El aporte USDC permanece intacto y no se convierte a BOB.
  assert.equal(data.aportesStellar.length, 1);
  assert.equal(data.aportesStellar[0].importe, 5);
  assert.equal(data.aportesStellar[0].assetCode, "USDC");
  // La meta fiat sigue en BOB y no incluye USDC.
  assert.equal(data.goals[0].moneda, "BOB");
  assert.equal(data.goals[0].ahorroAcumulado, 100);
});

// ——— Proveedor de cotizaciones: nunca inventa tasas ———

test("proveedor no disponible devuelve null y no genera equivalencia", async () => {
  const provider = new UnavailableRateProvider();
  const quote = await provider.getRate();
  assert.equal(quote, null);
  assert.deepEqual(buildConversionFields("USD", "BOB", 100, quote), {});
});

test("buildConversionFields con cotización válida guarda la equivalencia exacta", () => {
  const quote = {
    from: "USD",
    to: "BOB",
    rate: 6.91,
    provider: "bcb-bo",
    providerName: "Banco Central de Bolivia",
    fetchedAt: "2026-11-01T00:00:00Z",
    status: "valid" as const,
  };
  const fields = buildConversionFields("USD", "BOB", 100, quote);
  assert.equal(fields.baseAmount, 691);
  assert.equal(fields.baseCurrency, "BOB");
  assert.equal(fields.exchangeRate, 6.91);
  assert.equal(fields.exchangeRateSource, "bcb-bo");
  assert.equal(fields.exchangeRateDate, "2026-11-01T00:00:00Z");
});

test("ManualRateProvider solo responde al par solicitado y valida la tasa", async () => {
  const quote = {
    from: "USD",
    to: "BOB",
    rate: 6.91,
    provider: "manual",
    providerName: "Manual",
    fetchedAt: "2026-11-01T00:00:00Z",
    status: "valid" as const,
  };
  const provider = new ManualRateProvider(quote);
  assert.ok(await provider.getRate("USD", "BOB"));
  assert.equal(await provider.getRate("EUR", "BOB"), null);
  const invalid = new ManualRateProvider({ ...quote, rate: -1 });
  assert.equal(await invalid.getRate("USD", "BOB"), null);
});

// ——— Cálculos en moneda común con conversión válida ———

test("totales mezclados con conversión válida se suman en la moneda común", () => {
  const txs = [
    tx({ id: "a", tipo: "ingreso", monto: 100, moneda: "BOB", fecha: "2026-11-02" }),
    tx({
      id: "b",
      tipo: "ingreso",
      monto: 10,
      moneda: "USD",
      baseAmount: 69,
      baseCurrency: "BOB",
      exchangeRate: 6.9,
      fecha: "2026-11-03",
    }),
    tx({ id: "c", tipo: "gasto", monto: 50, moneda: "BOB", fecha: "2026-11-04" }),
  ];
  const g = gananciaNeta(txs, "BOB");
  assert.equal(g.ingresos.total, 169);
  assert.equal(g.egresos.total, 50);
  assert.equal(g.ganancia, 119);
  assert.equal(g.pendientes, 0);
});

test("serieMensual y totalesPorCategoria respetan la moneda común", () => {
  const txs = [
    tx({ id: "a", tipo: "ingreso", monto: 100, moneda: "BOB", fecha: "2026-11-05" }),
    tx({
      id: "b",
      tipo: "gasto",
      monto: 10,
      moneda: "USD",
      baseAmount: 69,
      baseCurrency: "BOB",
      exchangeRate: 6.9,
      categoria: "Alquiler",
      fecha: "2026-11-06",
    }),
    tx({ id: "c", tipo: "gasto", monto: 30, moneda: "BOB", categoria: "Marketing", fecha: "2026-11-07" }),
  ];
  const serie = serieMensual(txs, 1, "2026-11-30", "BOB");
  assert.equal(serie.length, 1);
  assert.equal(serie[0].ingresos, 100);
  assert.equal(serie[0].egresos, 99);
  assert.equal(serie[0].ganancia, 1);
  const cats = totalesPorCategoria(txs, "BOB");
  assert.equal(cats[0].categoria, "Alquiler");
  assert.equal(cats[0].total, 69);
  assert.equal(totalByType(txs, "gasto", "BOB").total, 99);
});
