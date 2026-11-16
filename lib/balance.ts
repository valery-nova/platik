/**
 * Dinero disponible global: saldo de apertura + ajustes identificables +
 * todos los movimientos registrados (no solo los últimos 30 días).
 * Nunca inventa equivalencias: un importe sin cotización válida queda
 * pendiente y puede volver el total no determinable.
 */
import type {
  BalanceAdjustment,
  MonetaryAmount,
  OpeningBalance,
  PlatikData,
} from "./types";
import { montoEnBase } from "./finance";
import { currencyDigits } from "./currency/catalog";
import { roundToCurrency } from "./currency/decimal";
import type { EstadoDisponible } from "./insights";

export interface SaldoDisponible {
  estado: EstadoDisponible;
  /** Saldo disponible en la moneda principal (puede ser negativo); null si no se determina. */
  monto: number | null;
  moneda: string;
  motivo: string;
  saldoInicial: number | null;
  ajustes: number;
  netoMovimientos: number;
  pendientesIngresos: number;
  pendientesEgresos: number;
  pendientesAjustes: number;
}

function valor(x: MonetaryAmount, moneda: string): number | null {
  return montoEnBase(x, moneda);
}

export function saldoDisponible(
  data: Pick<PlatikData, "transactions" | "openingBalance" | "balanceAdjustments">,
  moneda: string,
): SaldoDisponible {
  const digits = currencyDigits(moneda);
  let saldoInicial = 0;
  let tieneSaldo = false;
  let ajustes = 0;
  let neto = 0;
  let pendientesIngresos = 0;
  let pendientesEgresos = 0;
  let pendientesAjustes = 0;
  const tieneDatos = data.openingBalance !== null || data.balanceAdjustments.length > 0 || data.transactions.length > 0;

  if (data.openingBalance) {
    const v = valor(data.openingBalance, moneda);
    if (v === null) pendientesAjustes += 1;
    else {
      saldoInicial = roundToCurrency(v, digits);
      tieneSaldo = true;
    }
  }

  for (const adj of data.balanceAdjustments) {
    const v = valor(adj, moneda);
    if (v === null) pendientesAjustes += 1;
    else {
      ajustes = roundToCurrency(ajustes + v, digits);
      tieneSaldo = true;
    }
  }

  for (const tx of data.transactions) {
    const v = valor(tx, moneda);
    if (v === null) {
      if (tx.tipo === "ingreso") pendientesIngresos += 1;
      else pendientesEgresos += 1;
      continue;
    }
    if (tx.tipo === "ingreso") neto = roundToCurrency(neto + v, digits);
    else if (tx.tipo === "gasto" || tx.tipo === "costo") neto = roundToCurrency(neto - v, digits);
  }

  const base: Omit<SaldoDisponible, "estado" | "monto" | "motivo"> = {
    moneda: moneda.toUpperCase(),
    saldoInicial: tieneSaldo ? saldoInicial : null,
    ajustes,
    netoMovimientos: neto,
    pendientesIngresos,
    pendientesEgresos,
    pendientesAjustes,
  };

  if (pendientesEgresos > 0 || pendientesAjustes > 0) {
    const n = pendientesEgresos + pendientesAjustes;
    return {
      ...base,
      estado: "incompleto",
      monto: null,
      motivo: `${n} importe(s) en otra moneda no tienen cotización válida. Sin ellos el saldo podría estar sobrestimado, así que no lo calculamos.`,
    };
  }
  if (!tieneDatos) {
    return {
      ...base,
      estado: "sin_datos",
      monto: null,
      motivo: "Aún no registras saldo inicial, ajustes ni movimientos.",
    };
  }

  const total = roundToCurrency((tieneSaldo ? saldoInicial : 0) + ajustes + neto, digits);
  const estado: EstadoDisponible = pendientesIngresos > 0 ? "parcial" : "determinado";
  const motivo =
    pendientesIngresos > 0
      ? `Estimación conservadora: ${pendientesIngresos} ingreso(s) sin cotización válida no se cuentan.`
      : total > 0
        ? "Saldo de apertura + ajustes + movimientos registrados. No es tu saldo bancario."
        : "Los movimientos y ajustes igualan o superan al saldo inicial: no hay excedente para distribuir.";
  return { ...base, estado, monto: total, motivo };
}

/** Convierte un ajuste con signo a los campos de persistencia. */
export function conversionDeAjuste(
  adj: Pick<BalanceAdjustment, "monto" | "moneda"> & Partial<MonetaryAmount>,
): MonetaryAmount {
  return {
    monto: adj.monto,
    moneda: adj.moneda.toUpperCase(),
    baseAmount: adj.baseAmount,
    baseCurrency: adj.baseCurrency,
    exchangeRate: adj.exchangeRate,
    exchangeRateSource: adj.exchangeRateSource,
    exchangeRateDate: adj.exchangeRateDate,
    exchangeRateType: adj.exchangeRateType,
    exchangeRatePublishedAt: adj.exchangeRatePublishedAt,
  };
}

export type { OpeningBalance };
