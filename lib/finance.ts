import type { Transaction, TxType } from "./types";

/**
 * Cálculos financieros deterministas. Todas las cifras que se muestran
 * en la app salen de estas funciones — ningún número se inventa en la UI.
 */

export function totalByType(txs: Transaction[], tipo: TxType): number {
  return txs
    .filter((t) => t.tipo === tipo)
    .reduce((acc, t) => acc + t.monto, 0);
}

/** Egresos totales = costos + gastos. */
export function totalEgresos(txs: Transaction[]): number {
  return totalByType(txs, "costo") + totalByType(txs, "gasto");
}

/** Ganancia neta estimada = ingresos - costos - gastos. */
export function gananciaNeta(txs: Transaction[]): number {
  return totalByType(txs, "ingreso") - totalEgresos(txs);
}

/** Margen de ganancia = ganancia neta / ingresos. 0 si no hay ingresos. */
export function margenGanancia(txs: Transaction[]): number {
  const ingresos = totalByType(txs, "ingreso");
  if (ingresos <= 0) return 0;
  return (gananciaNeta(txs) / ingresos) * 100;
}

export function txInRange(
  txs: Transaction[],
  desdeISO?: string,
  hastaISO?: string,
): Transaction[] {
  return txs.filter(
    (t) => (!desdeISO || t.fecha >= desdeISO) && (!hastaISO || t.fecha <= hastaISO),
  );
}

export interface MesSerie {
  mes: string; // "2026-10"
  ingresos: number;
  costos: number;
  gastos: number;
  egresos: number;
  ganancia: number;
}

/** Serie mensual de los últimos `meses` meses terminando en `hasta` (default hoy). */
export function serieMensual(
  txs: Transaction[],
  meses = 6,
  hasta: Date = new Date(),
): MesSerie[] {
  const series: MesSerie[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(hasta.getFullYear(), hasta.getMonth() - i, 1);
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    series.push({ mes, ingresos: 0, costos: 0, gastos: 0, egresos: 0, ganancia: 0 });
  }
  const index = new Map(series.map((s, i) => [s.mes, i]));
  for (const t of txs) {
    const mes = t.fecha.slice(0, 7);
    const i = index.get(mes);
    if (i === undefined) continue;
    if (t.tipo === "ingreso") series[i].ingresos += t.monto;
    else if (t.tipo === "costo") series[i].costos += t.monto;
    else series[i].gastos += t.monto;
  }
  for (const s of series) {
    s.egresos = s.costos + s.gastos;
    s.ganancia = s.ingresos - s.egresos;
  }
  return series;
}

export interface CategoriaTotal {
  categoria: string;
  total: number;
  porcentaje: number;
}

/** Totales por categoría para un tipo, ordenados de mayor a menor. */
export function totalesPorCategoria(
  txs: Transaction[],
  tipos: TxType[],
): CategoriaTotal[] {
  const map = new Map<string, number>();
  let total = 0;
  for (const t of txs) {
    if (!tipos.includes(t.tipo)) continue;
    map.set(t.categoria, (map.get(t.categoria) ?? 0) + t.monto);
    total += t.monto;
  }
  return [...map.entries()]
    .map(([categoria, t]) => ({
      categoria,
      total: t,
      porcentaje: total > 0 ? (t / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/** Últimas n transacciones por fecha descendente. */
export function ultimasTransacciones(
  txs: Transaction[],
  n = 5,
): Transaction[] {
  return [...txs].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, n);
}

/** Monto libre estimado para ahorrar = ganancia neta si es positiva. */
export function excedenteEstimado(txs: Transaction[]): number {
  return Math.max(0, gananciaNeta(txs));
}

export function hoyISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function haceDiasISO(n: number, d: Date = new Date()): string {
  return hoyISO(new Date(d.getFullYear(), d.getMonth(), d.getDate() - n));
}
