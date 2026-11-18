/**
 * Recomendación de ahorro digital a partir de las finanzas personales.
 * Determinista y sin ejecutar transferencias ni simular conversión BOB→USDC.
 */
import { currencyDigits } from "./currency/catalog";
import { roundToCurrency } from "./currency/decimal";
import { gananciaNeta, haceDiasISO, hoyISO, txInRange } from "./finance";
import type { Transaction } from "./types";

export interface RecomendacionAhorro {
  /** Monto sugerido en la moneda principal del usuario. */
  monto: number;
  moneda: string;
  /** Porcentaje del excedente del período usado para la sugerencia. */
  porcentaje: number;
  excedente: number;
  motivo: string;
}

const DIAS_PERIODO = 30;
const PORCENTAJE_AHORRO = 20;

export function recomendarAhorroDigital(
  txs: Transaction[],
  monedaBase: string,
): RecomendacionAhorro | null {
  const moneda = monedaBase.toUpperCase();
  const hasta = hoyISO();
  const desde = haceDiasISO(DIAS_PERIODO);
  const delPeriodo = txInRange(txs, desde, hasta);
  const g = gananciaNeta(delPeriodo, moneda);
  const excedente = g.ganancia;
  if (!(excedente > 0) || g.pendientes > 0) return null;

  const digits = currencyDigits(moneda);
  const monto = roundToCurrency((excedente * PORCENTAJE_AHORRO) / 100, digits);
  if (!(monto > 0)) return null;

  return {
    monto,
    moneda,
    porcentaje: PORCENTAJE_AHORRO,
    excedente: roundToCurrency(excedente, digits),
    motivo: `Excedente estimado de los últimos ${DIAS_PERIODO} días tras cubrir ingresos y egresos registrados.`,
  };
}
