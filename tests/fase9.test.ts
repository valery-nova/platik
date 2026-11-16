import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORIAS_DISTRIBUCION,
  diagnostico,
  dineroDisponible,
  interpretar,
  montosDistribucion,
  pctDe,
  resumenPeriodo,
  validarDistribucion,
  variacionPct,
} from "../lib/insights";
import { gananciaNeta, margenGanancia, totalesPorCategoria } from "../lib/finance";
import { refrescarPendientes } from "../lib/currency/refresh";
import { RateService } from "../lib/currency/service";
import { RateCache } from "../lib/currency/cache";
import type { ExchangeRateProvider, ExchangeRateQuote } from "../lib/currency/rates";
import type { Distribution, Transaction } from "../lib/types";

const AHORA = new Date("2026-11-16T12:00:00Z");
const ACTUAL = { desde: "2026-10-18", hasta: "2026-11-16" };
const PREVIO = { desde: "2026-09-18", hasta: "2026-10-17" };

let seq = 0;
function tx(p: Partial<Transaction>): Transaction {
  seq += 1;
  return {
    id: p.id ?? `t${seq}`,
    tipo: p.tipo ?? "ingreso",
    monto: p.monto ?? 0,
    categoria: p.categoria ?? "Ventas",
    descripcion: p.descripcion ?? "demo",
    fecha: p.fecha ?? "2026-11-10",
    moneda: p.moneda ?? "BOB",
    ...p,
  };
}

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

const servicio = (p: ExchangeRateProvider) =>
  new RateService(p, new RateCache(), undefined, () => AHORA);

/** Datos con dos períodos comparables. */
function negocio(): Transaction[] {
  return [
    // Período anterior: ingresos 1000, egresos 600 → ganancia 400 (40%).
    tx({ tipo: "ingreso", monto: 1000, fecha: "2026-10-01" }),
    tx({ tipo: "costo", monto: 400, categoria: "Insumos", fecha: "2026-10-02" }),
    tx({ tipo: "gasto", monto: 200, categoria: "Marketing", fecha: "2026-10-03" }),
    // Período actual: ingresos 1200, egresos 900 → ganancia 300 (25%).
    tx({ tipo: "ingreso", monto: 800, fecha: "2026-11-01", categoria: "Ventas" }),
    tx({ tipo: "ingreso", monto: 400, fecha: "2026-11-02", categoria: "Servicios" }),
    tx({ tipo: "costo", monto: 600, categoria: "Insumos", fecha: "2026-11-03" }),
    tx({ tipo: "gasto", monto: 300, categoria: "Marketing", fecha: "2026-11-04" }),
  ];
}

// 1. Ganancias y márgenes
test("F9-1: ganancia, costos, gastos y margen correctos", () => {
  const r = resumenPeriodo(negocio(), "BOB", ACTUAL.desde, ACTUAL.hasta);
  assert.equal(r.ingresos, 1200);
  assert.equal(r.costos, 600);
  assert.equal(r.gastos, 300);
  assert.equal(r.egresos, 900);
  assert.equal(r.ganancia, 300);
  assert.equal(r.margen, 25);
  // Coherente con lib/finance (no se duplica lógica divergente).
  const enRango = negocio().filter((t) => t.fecha >= ACTUAL.desde);
  assert.equal(gananciaNeta(enRango, "BOB").ganancia, r.ganancia);
  assert.equal(margenGanancia(enRango, "BOB"), r.margen);
  // Sin ingresos ⇒ margen null (no 0 inventado).
  const sinIng = resumenPeriodo([tx({ tipo: "gasto", monto: 50 })], "BOB", ACTUAL.desde, ACTUAL.hasta);
  assert.equal(sinIng.margen, null);
  assert.equal(variacionPct(10, 0), null);
});

// 2. Ingresos ≠ dinero disponible
test("F9-2: dinero disponible es el excedente, no los ingresos brutos", () => {
  const r = resumenPeriodo(negocio(), "BOB", ACTUAL.desde, ACTUAL.hasta);
  const d = dineroDisponible(r);
  assert.equal(d.estado, "determinado");
  assert.equal(d.monto, 300);
  assert.notEqual(d.monto, r.ingresos);
  // Pérdida ⇒ disponible 0 (no negativo, no ingresos).
  const perdida = dineroDisponible(
    resumenPeriodo(
      [tx({ monto: 100 }), tx({ tipo: "gasto", monto: 250 })],
      "BOB",
      ACTUAL.desde,
      ACTUAL.hasta,
    ),
  );
  assert.equal(perdida.monto, 0);
  // Sin ingresos ⇒ no determinable.
  const vacio = dineroDisponible(resumenPeriodo([], "BOB", ACTUAL.desde, ACTUAL.hasta));
  assert.equal(vacio.estado, "sin_datos");
  assert.equal(vacio.monto, null);
});

// 3. Interpretación con datos suficientes
test("F9-3: interpretación derivada de cálculos reales", () => {
  const { hallazgos } = diagnostico(negocio(), "BOB", ACTUAL, PREVIO);
  const ids = hallazgos.map((h) => h.id);
  assert.ok(ids.includes("resultado_positivo"));
  assert.ok(ids.includes("ingresos_suben")); // 1000 → 1200 (+20%)
  assert.ok(ids.includes("egresos_suben")); // 600 → 900 (+50%)
  assert.ok(ids.includes("ganancia_menor")); // 400 → 300
  assert.ok(ids.includes("margen_baja")); // 40% → 25%
  assert.ok(ids.includes("concentracion_egresos")); // Insumos 66.7%
  const conc = hallazgos.find((h) => h.id === "concentracion_egresos")!;
  assert.match(conc.texto, /Insumos/);
  assert.match(conc.texto, /67%/);
  assert.ok(hallazgos.every((h) => h.calculo.length > 0));
  // Estabilidad: variación < 5% no se presenta como subida ni bajada.
  const estable = diagnostico(
    [
      ...negocio().slice(0, 3),
      tx({ monto: 1020, fecha: "2026-11-01" }),
      tx({ tipo: "costo", monto: 400, categoria: "Insumos", fecha: "2026-11-02" }),
      tx({ tipo: "gasto", monto: 200, categoria: "Marketing", fecha: "2026-11-03" }),
    ],
    "BOB",
    ACTUAL,
    PREVIO,
  ).hallazgos.map((h) => h.id);
  assert.ok(estable.includes("ingresos_estables"));
  assert.ok(!estable.includes("egresos_suben") && !estable.includes("egresos_bajan"));
});

// 4. Sin conclusiones con datos insuficientes
test("F9-4: sin tendencias cuando los datos son insuficientes", () => {
  const vacio = diagnostico([], "BOB", ACTUAL, PREVIO).hallazgos;
  assert.deepEqual(vacio.map((h) => h.id), ["sin_datos"]);

  const pocos = diagnostico([tx({ monto: 500 })], "BOB", ACTUAL, PREVIO).hallazgos.map((h) => h.id);
  assert.ok(pocos.includes("datos_insuficientes"));
  for (const id of ["ingresos_suben", "ingresos_bajan", "ganancia_menor", "ganancia_mayor", "margen_baja", "margen_mejora"]) {
    assert.ok(!pocos.includes(id), id);
  }
  // Período actual suficiente pero anterior vacío ⇒ no se compara.
  const sinPrevio = diagnostico(negocio().slice(3), "BOB", ACTUAL, PREVIO).hallazgos.map((h) => h.id);
  assert.ok(sinPrevio.includes("sin_comparacion"));
  assert.ok(!sinPrevio.some((id) => id.startsWith("ingresos_") || id.startsWith("margen_")));
  // Una sola categoría de egreso no se presenta como "concentración".
  const unaCat = interpretar({
    actual: resumenPeriodo(negocio().slice(3, 6), "BOB", ACTUAL.desde, ACTUAL.hasta),
    previo: resumenPeriodo([], "BOB", PREVIO.desde, PREVIO.hasta),
    categoriasEgreso: totalesPorCategoria(negocio().slice(5, 6), "BOB"),
    categoriasIngreso: [],
  }).map((h) => h.id);
  assert.ok(!unaCat.includes("concentracion_egresos"));
});

// 5. Distribución editable y validación
test("F9-5: validación de porcentajes y edición por monto", () => {
  assert.equal(CATEGORIAS_DISTRIBUCION.map((c) => c.nombre).join("|"), "Capital operativo|Reinversión|Ahorro para metas futuras");
  assert.ok(validarDistribucion({ operacion: 50, reinversion: 30, ahorro: 20 }).valida);
  const parcial = validarDistribucion({ operacion: 40, reinversion: 20, ahorro: 10 });
  assert.ok(parcial.valida);
  assert.equal(parcial.sinAsignar, 30);
  const excede = validarDistribucion({ operacion: 60, reinversion: 30, ahorro: 20 });
  assert.equal(excede.valida, false);
  assert.match(excede.errores[0], /110%/);
  assert.equal(validarDistribucion({ operacion: -5, reinversion: 50, ahorro: 20 }).valida, false);
  assert.equal(validarDistribucion({ operacion: Number.NaN, reinversion: 50, ahorro: 20 }).valida, false);
  assert.equal(validarDistribucion({ operacion: 101, reinversion: 0, ahorro: 0 }).valida, false);
  const m = montosDistribucion({ operacion: 25, reinversion: 50, ahorro: 25 }, 300, "BOB")!;
  assert.deepEqual([m.operacion, m.reinversion, m.ahorro, m.sinAsignar], [75, 150, 75, 0]);
  // Distribución temporalmente inválida (suma > 100): sigue mostrando importes
  // para poder corregirla por importe; el guardado queda bloqueado por validarDistribucion.
  const invalida = { operacion: 80, reinversion: 30, ahorro: 0 };
  assert.equal(validarDistribucion(invalida).valida, false);
  assert.ok(montosDistribucion(invalida, 300, "BOB") !== null);
});

// 5b. Reparto exacto por importe (sin pérdida de centavos)
test("F9-5b: porcentaje y monto se corresponden sin alterar el importe", () => {
  const d = 10 ** 2; // BOB
  const pct = pctDe(d);
  const disponible = 3410;
  // 100 BOB ⇒ 2,93 % (no 2,93 % que redondee a 99,91).
  const p = pct(100, disponible);
  assert.equal(p, 2.933);
  const m = montosDistribucion({ operacion: p, reinversion: 100 - p, ahorro: 0 }, disponible, "BOB")!;
  // Como mucho ±1 unidad monetaria por el redondeo, y el total no excede el disponible.
  assert.ok(m.operacion >= 99.99 && m.operacion <= 100.1);
  assert.ok(m.reinversion >= 3309.9 && m.reinversion <= 3310.1);
  assert.equal(m.sinAsignar, 0);
  assert.ok(m.operacion + m.reinversion + m.ahorro <= disponible);
  // El reparto completo de un importe exacto en JPY (sin decimales).
  const jpy = montosDistribucion({ operacion: pctDe(0)(400, 1000), reinversion: 0, ahorro: 0 }, 1000, "JPY")!;
  assert.ok(jpy.operacion >= 399);
});

// 5c. Totales parciales: se avisa y no se presentan tendencias como completas
test("F9-5c: con cotizaciones pendientes se advierte sobre las tendencias", () => {
  const txs = [
    ...negocio(),
    tx({ tipo: "gasto", monto: 100, moneda: "USD", categoria: "SaaS", fecha: "2026-11-05" }),
    tx({ tipo: "gasto", monto: 200, moneda: "EUR", categoria: "Oficina", fecha: "2026-10-05" }),
  ];
  const { hallazgos } = diagnostico(txs, "BOB", ACTUAL, PREVIO);
  const ids = hallazgos.map((h) => h.id);
  assert.ok(ids.includes("tendencias_parciales"));
  assert.ok(ids.includes("pendientes_conversion"));
  // Las tendencias se siguen mostrando (con la advertencia), pero con cálculo visible.
  assert.ok(ids.includes("egresos_suben"));
  assert.ok(hallazgos.every((h) => h.calculo.length > 0));
});

// 6. Nunca excede el disponible
test("F9-6: la distribución nunca supera el dinero disponible (redondeo ISO)", () => {
  const casos: [Distribution, number, string][] = [
    [{ operacion: 33.33, reinversion: 33.33, ahorro: 33.34 }, 100.01, "BOB"],
    [{ operacion: 50, reinversion: 50, ahorro: 0 }, 1, "JPY"],
    [{ operacion: 33.34, reinversion: 33.33, ahorro: 33.33 }, 0.005, "KWD"],
    [{ operacion: 16.67, reinversion: 16.67, ahorro: 66.66 }, 7, "JPY"],
  ];
  for (const [d, disp, moneda] of casos) {
    const m = montosDistribucion(d, disp, moneda)!;
    const suma = m.operacion + m.reinversion + m.ahorro;
    assert.ok(suma <= disp + 1e-9, `${moneda}: ${suma} > ${disp}`);
    assert.ok(m.sinAsignar >= 0);
    assert.ok([m.operacion, m.reinversion, m.ahorro].every((v) => v >= 0));
  }
  assert.equal(montosDistribucion({ operacion: 50, reinversion: 30, ahorro: 20 }, -1, "BOB"), null);
});

// 7. Distintas monedas
test("F9-7: solo se suman importes con equivalencia válida en la moneda principal", () => {
  const txs = [
    tx({ monto: 1000 }), // BOB
    tx({ monto: 100, moneda: "USD", baseAmount: 690, baseCurrency: "BOB", exchangeRate: 6.9, exchangeRateSource: "mock" }),
    tx({ monto: 50, moneda: "EUR" }), // sin cotización ⇒ pendiente
    tx({ tipo: "gasto", monto: 300, categoria: "Renta" }),
  ];
  const r = resumenPeriodo(txs, "BOB", ACTUAL.desde, ACTUAL.hasta);
  assert.equal(r.ingresos, 1690);
  assert.equal(r.pendientesIngresos, 1);
  const d = dineroDisponible(r);
  assert.equal(d.estado, "parcial"); // conservador: el ingreso EUR no cuenta
  assert.equal(d.monto, 1390);
  // Con moneda principal USD: el USD cuenta por su importe original; BOB y
  // EUR sin conversión hacia USD no se suman.
  const usd = resumenPeriodo(txs, "USD", ACTUAL.desde, ACTUAL.hasta);
  assert.equal(usd.ingresos, 100);
  assert.equal(usd.pendientesIngresos, 2);
  assert.equal(usd.pendientesEgresos, 1);
  assert.equal(dineroDisponible(usd).estado, "incompleto");
  // Precisión decimal ISO (JPY sin decimales).
  const jpy = resumenPeriodo([tx({ monto: 1000, moneda: "JPY" }), tx({ tipo: "gasto", monto: 333, moneda: "JPY" })], "JPY", ACTUAL.desde, ACTUAL.hasta);
  assert.equal(jpy.ganancia, 667);
});

// 8. Cotizaciones no disponibles o desactualizadas
test("F9-8: egreso sin cotización bloquea la distribución; tasas no usables no convierten", async () => {
  const txs = [tx({ monto: 1000 }), tx({ tipo: "gasto", monto: 100, moneda: "USD", categoria: "SaaS" })];
  const d = dineroDisponible(resumenPeriodo(txs, "BOB", ACTUAL.desde, ACTUAL.hasta));
  assert.equal(d.estado, "incompleto");
  assert.equal(d.monto, null);
  const { hallazgos } = diagnostico(txs, "BOB", ACTUAL, PREVIO);
  assert.ok(hallazgos.some((h) => h.id === "pendientes_conversion"));

  for (const q of [
    quote({ publishedAt: "2026-11-01" }), // desactualizada
    quote({ status: "unavailable" }),
    quote({ status: "expired" }),
    null,
  ]) {
    const res = await refrescarPendientes(txs, "BOB", servicio(new ScriptedProvider({ "USD|BOB": q })));
    assert.equal(res.convertidos, 0);
    assert.equal(dineroDisponible(resumenPeriodo(res.transactions, "BOB", ACTUAL.desde, ACTUAL.hasta)).monto, null);
  }
  // Con cotización vigente el egreso se incluye y el disponible se determina.
  const ok = await refrescarPendientes(txs, "BOB", servicio(new ScriptedProvider({ "USD|BOB": quote({}) })));
  assert.equal(ok.convertidos, 1);
  const r = resumenPeriodo(ok.transactions, "BOB", ACTUAL.desde, ACTUAL.hasta);
  assert.equal(r.egresos, 690);
  assert.equal(dineroDisponible(r).monto, 310);
});

// 9. Snapshots históricos
test("F9-9: el diagnóstico no modifica movimientos ni snapshots", () => {
  const txs = [
    ...negocio(),
    tx({ monto: 100, moneda: "USD", baseAmount: 686, baseCurrency: "BOB", exchangeRate: 6.86, exchangeRateSource: "frankfurter", exchangeRateDate: "2026-11-05" }),
  ];
  const copia = JSON.parse(JSON.stringify(txs));
  const diag = diagnostico(txs, "BOB", ACTUAL, PREVIO);
  dineroDisponible(diag.actual);
  montosDistribucion({ operacion: 50, reinversion: 30, ahorro: 20 }, diag.disponible.monto ?? 0, "BOB");
  assert.deepEqual(txs, copia);
  // El snapshot histórico (6.86) se usa tal cual, sin recalcular.
  assert.equal(diag.actual.ingresos, 1200 + 686);
});

// 10. No regresión
test("F9-10: no regresión de cálculos existentes y separación USDC", () => {
  const enRango = negocio().filter((t) => t.fecha >= ACTUAL.desde);
  const g = gananciaNeta(enRango, "BOB");
  assert.equal(g.ingresos.total, 1200);
  assert.equal(g.egresos.total, 900);
  const cats = totalesPorCategoria(enRango, "BOB");
  assert.equal(cats[0].categoria, "Insumos");
  // USDC no es moneda fiat: un movimiento etiquetado USDC nunca se suma a BOB/USD.
  const r = resumenPeriodo([tx({ monto: 10, moneda: "USDC" })], "USD", ACTUAL.desde, ACTUAL.hasta);
  assert.equal(r.ingresos, 0);
  assert.equal(r.pendientesIngresos, 1);
});
