/**
 * Actualización de movimientos pendientes de conversión.
 *
 * Solo toca movimientos que:
 * - están en una moneda distinta de la moneda principal, y
 * - no tienen equivalencia válida para esa moneda principal, y
 * - nunca tuvieron snapshot de conversión (los snapshots históricos de
 *   otra moneda base se conservan intactos: no se sobrescriben).
 *
 * Cuando existe una cotización válida se guarda un snapshot trazable
 * (fuente, fecha, tipo). Cuando no, el movimiento sigue pendiente y se
 * conserva con su importe original.
 */
import { tieneConversionValida } from "../finance";
import type { BalanceAdjustment, MonetaryAmount, OpeningBalance, Transaction } from "../types";
import { buildConversionFields } from "./rates";
import type { RateService } from "./service";

export interface RefreshResult {
  /** Lista completa con los movimientos actualizados. */
  transactions: Transaction[];
  /** Solo los movimientos que recibieron una nueva equivalencia. */
  actualizados: Transaction[];
  /** Cuántos movimientos recibieron equivalencia. */
  convertidos: number;
  /** Cuántos siguen pendientes de conversión. */
  pendientes: number;
}

/** ¿El movimiento nunca tuvo snapshot de conversión? */
function sinSnapshot(tx: Transaction): boolean {
  return (
    tx.baseAmount == null &&
    tx.exchangeRate == null &&
    tx.exchangeRateSource == null
  );
}

export async function refrescarPendientes(
  transactions: Transaction[],
  monedaBase: string,
  service: RateService,
  options?: { force?: boolean },
): Promise<RefreshResult> {
  const base = monedaBase.toUpperCase();
  const out = [...transactions];
  const actualizados: Transaction[] = [];

  for (let i = 0; i < out.length; i++) {
    const tx = out[i];
    const moneda = (tx.moneda || "BOB").toUpperCase();
    if (moneda === base) continue;
    if (tieneConversionValida(tx, base)) continue;
    if (!sinSnapshot(tx)) continue; // snapshot histórico: no se toca

    const { quote } = await service.quote(moneda, base, options);
    if (!quote || quote.status !== "valid") continue;

    const fields = buildConversionFields(moneda, base, tx.monto, quote);
    if (Object.keys(fields).length === 0) continue;

    const actualizado: Transaction = { ...tx, ...fields };
    out[i] = actualizado;
    actualizados.push(actualizado);
  }

  const pendientes = out.filter((t) => {
    const moneda = (t.moneda || "BOB").toUpperCase();
    return moneda !== base && !tieneConversionValida(t, base);
  }).length;

  return { transactions: out, actualizados, convertidos: actualizados.length, pendientes };
}

export interface RefreshSaldosResult {
  openingBalance: OpeningBalance | null;
  balanceAdjustments: BalanceAdjustment[];
  convertidos: number;
  pendientes: number;
}

function sinSnapshotMonetario(item: MonetaryAmount): boolean {
  return item.baseAmount == null && item.exchangeRate == null && item.exchangeRateSource == null;
}

async function refrescarMonetario<T extends MonetaryAmount & { id: string }>(
  item: T,
  monedaBase: string,
  service: RateService,
  options?: { force?: boolean },
): Promise<{ item: T; convertido: boolean }> {
  const base = monedaBase.toUpperCase();
  const moneda = (item.moneda || "BOB").toUpperCase();
  if (moneda === base) return { item, convertido: false };
  if (tieneConversionValida(item, base)) return { item, convertido: false };
  if (!sinSnapshotMonetario(item)) return { item, convertido: false };

  const { quote } = await service.quote(moneda, base, options);
  if (!quote || quote.status !== "valid") return { item, convertido: false };
  const fields = buildConversionFields(moneda, base, item.monto, quote);
  if (Object.keys(fields).length === 0) return { item, convertido: false };
  return { item: { ...item, ...fields }, convertido: true };
}

/** Reintenta cotizaciones pendientes de saldo inicial y ajustes, sin tocar snapshots históricos. */
export async function refrescarPendientesSaldos(
  data: { openingBalance: OpeningBalance | null; balanceAdjustments: BalanceAdjustment[] },
  monedaBase: string,
  service: RateService,
  options?: { force?: boolean },
): Promise<RefreshSaldosResult> {
  const base = monedaBase.toUpperCase();
  let convertidos = 0;
  let openingBalance = data.openingBalance;
  if (openingBalance) {
    const r = await refrescarMonetario(openingBalance, base, service, options);
    openingBalance = r.item;
    if (r.convertido) convertidos += 1;
  }
  const balanceAdjustments: BalanceAdjustment[] = [];
  for (const ajuste of data.balanceAdjustments) {
    const r = await refrescarMonetario(ajuste, base, service, options);
    balanceAdjustments.push(r.item);
    if (r.convertido) convertidos += 1;
  }
  const pendientes =
    (openingBalance && (openingBalance.moneda || "BOB").toUpperCase() !== base && !tieneConversionValida(openingBalance, base) ? 1 : 0) +
    balanceAdjustments.filter((a) => (a.moneda || "BOB").toUpperCase() !== base && !tieneConversionValida(a, base)).length;
  return { openingBalance, balanceAdjustments, convertidos, pendientes };
}
