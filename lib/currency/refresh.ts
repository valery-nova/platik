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
import type { Transaction } from "../types";
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
