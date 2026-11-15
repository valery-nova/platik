/**
 * Cálculos financieros deterministas y conscientes de la moneda.
 *
 * Regla de oro: nunca se suman importes de monedas distintas sin una
 * conversión válida guardada en el propio movimiento. Los movimientos sin
 * cotización válida se conservan con su importe original y se marcan como
 * pendientes de conversión; nunca se inventa una equivalencia.
 */
import type { Distribution, Transaction } from "./types";

/** ¿El movimiento ya tiene una equivalencia válida en la moneda indicada? */
export function tieneConversionValida(tx: Transaction, monedaBase: string): boolean {
  return (
    typeof tx.baseAmount === "number" &&
    Number.isFinite(tx.baseAmount) &&
    typeof tx.baseCurrency === "string" &&
    tx.baseCurrency.toUpperCase() === monedaBase.toUpperCase() &&
    typeof tx.exchangeRate === "number" &&
    Number.isFinite(tx.exchangeRate) &&
    tx.exchangeRate > 0
  );
}

/**
 * Importe del movimiento en la moneda común indicada, o null si no hay
 * conversión válida. Misma moneda ⇒ el importe original es válido.
 */
export function montoEnBase(tx: Transaction, monedaBase: string): number | null {
  const moneda = (tx.moneda || "BOB").toUpperCase();
  const base = monedaBase.toUpperCase();
  if (moneda === base) return tx.monto;
  if (tieneConversionValida(tx, base)) return tx.baseAmount ?? null;
  return null;
}

export interface TotalMoneda {
  total: number;
  /** Movimientos sin conversión válida (excluidos del total). */
  pendientes: number;
  /** Moneda común usada. */
  moneda: string;
}

function sumarPorTipo(
  txs: Transaction[],
  tipo: Transaction["tipo"],
  monedaBase: string,
): TotalMoneda {
  let total = 0;
  let pendientes = 0;
  for (const tx of txs) {
    if (tx.tipo !== tipo) continue;
    const v = montoEnBase(tx, monedaBase);
    if (v === null) pendientes += 1;
    else total += v;
  }
  return { total, pendientes, moneda: monedaBase.toUpperCase() };
}

export function totalByType(
  txs: Transaction[],
  tipo: Transaction["tipo"],
  monedaBase: string,
): TotalMoneda {
  return sumarPorTipo(txs, tipo, monedaBase);
}

export function totalEgresos(txs: Transaction[], monedaBase: string): TotalMoneda {
  // Egresos = gastos + costos.
  let total = 0;
  let pendientes = 0;
  for (const tx of txs) {
    if (tx.tipo !== "gasto" && tx.tipo !== "costo") continue;
    const v = montoEnBase(tx, monedaBase);
    if (v === null) pendientes += 1;
    else total += v;
  }
  return { total, pendientes, moneda: monedaBase.toUpperCase() };
}

export interface Ganancia {
  ingresos: TotalMoneda;
  egresos: TotalMoneda;
  ganancia: number;
  /** Pendientes totales (ingresos + egresos sin conversión válida). */
  pendientes: number;
  moneda: string;
}

export function gananciaNeta(txs: Transaction[], monedaBase: string): Ganancia {
  const ingresos = sumarPorTipo(txs, "ingreso", monedaBase);
  const egresos = totalEgresos(txs, monedaBase);
  const ganancia = ingresos.total - egresos.total;
  return {
    ingresos,
    egresos,
    ganancia,
    pendientes: ingresos.pendientes + egresos.pendientes,
    moneda: monedaBase.toUpperCase(),
  };
}

export function margenGanancia(txs: Transaction[], monedaBase: string): number | null {
  const g = gananciaNeta(txs, monedaBase);
  if (g.ingresos.total <= 0) return null;
  return (g.ganancia / g.ingresos.total) * 100;
}

/** Movimientos dentro de un rango de fechas ISO (inclusive). */
export function txInRange(
  txs: Transaction[],
  desde: string,
  hasta: string = "9999-12-31",
): Transaction[] {
  return txs.filter((tx) => tx.fecha >= desde && tx.fecha <= hasta);
}

export interface PuntoMensual {
  mes: string; // "YYYY-MM"
  ingresos: number;
  egresos: number;
  ganancia: number;
}

/** Serie mensual en la moneda común indicada; los pendientes se excluyen. */
export function serieMensual(
  txs: Transaction[],
  meses: number,
  hasta: string,
  monedaBase: string,
): PuntoMensual[] {
  const out: PuntoMensual[] = [];
  const [hy, hm] = hasta.slice(0, 7).split("-").map(Number);
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(hy, hm - 1 - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ mes: key, ingresos: 0, egresos: 0, ganancia: 0 });
  }
  const index = new Map(out.map((p, idx) => [p.mes, idx]));
  for (const tx of txs) {
    const key = tx.fecha.slice(0, 7);
    const idx = index.get(key);
    if (idx === undefined) continue;
    const v = montoEnBase(tx, monedaBase);
    if (v === null) continue;
    if (tx.tipo === "ingreso") out[idx].ingresos += v;
    else if (tx.tipo === "gasto" || tx.tipo === "costo") out[idx].egresos += v;
  }
  for (const p of out) p.ganancia = p.ingresos - p.egresos;
  return out;
}

export interface CategoriaTotal {
  categoria: string;
  total: number;
  /** Porcentaje sobre el total de los tipos considerados. */
  porcentaje: number;
}

/** Totales por categoría en la moneda común, con porcentaje del total. */
export function totalesPorCategoria(
  txs: Transaction[],
  monedaBase: string,
  tipos: Transaction["tipo"][] = ["gasto", "costo"],
): CategoriaTotal[] {
  const acc = new Map<string, number>();
  let suma = 0;
  for (const tx of txs) {
    if (!tipos.includes(tx.tipo)) continue;
    const v = montoEnBase(tx, monedaBase);
    if (v === null) continue;
    acc.set(tx.categoria, (acc.get(tx.categoria) ?? 0) + v);
    suma += v;
  }
  return [...acc.entries()]
    .map(([categoria, total]) => ({
      categoria,
      total,
      porcentaje: suma > 0 ? (total / suma) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/** Últimas transacciones (sin conversión; se muestra su moneda original). */
export function ultimasTransacciones(txs: Transaction[], limite = 6): Transaction[] {
  return [...txs].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, limite);
}

/** Excedente estimado según la distribución configurada. */
export function excedenteEstimado(
  txs: Transaction[],
  distribucion: Distribution,
  monedaBase: string,
): { operacion: number; reinversion: number; ahorro: number; moneda: string } {
  const g = gananciaNeta(txs, monedaBase);
  const base = g.ganancia > 0 ? g.ganancia : 0;
  const pct = (p: number) => (base * p) / 100;
  return {
    operacion: pct(distribucion.operacion),
    reinversion: pct(distribucion.reinversion),
    ahorro: pct(distribucion.ahorro),
    moneda: monedaBase.toUpperCase(),
  };
}

export function hoyISO(fecha: Date = new Date()): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

export function haceDiasISO(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
