import type { Currency } from "./types";

const FORMATTERS: Record<Currency, Intl.NumberFormat> = {
  BOB: new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    maximumFractionDigits: 2,
  }),
  USD: new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }),
};

export function formatMoney(monto: number, moneda: Currency = "BOB") {
  return FORMATTERS[moneda].format(monto);
}

export function formatFecha(fechaISO: string) {
  const [y, m, d] = fechaISO.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-BO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatPct(valor: number, decimales = 1) {
  return `${valor.toFixed(decimales)}%`;
}

export function nombreMes(mesKey: string) {
  const [y, m] = mesKey.split("-").map(Number);
  return new Date(y, m - 1, 1)
    .toLocaleDateString("es-BO", { month: "short" })
    .replace(".", "");
}
