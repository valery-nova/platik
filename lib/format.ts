import { isCurrencyCode } from "./currency/catalog";

/**
 * Formato monetario internacional con Intl.NumberFormat.
 * - La moneda se muestra con su símbolo cuando es inequívoco (Bs, €).
 * - Cuando el símbolo es ambiguo ("$", "US$"), se muestra el código ISO
 *   (USD, MXN, CAD, AUD…) para que nunca haya confusión.
 * - Los decimales los define Intl según ISO 4217 (JPY 0, KWD 3…).
 */

const formatterCache = new Map<string, Intl.NumberFormat>();

function cacheKey(locale: string, currency: string, code: boolean): string {
  return `${locale}|${currency}|${code ? "code" : "symbol"}`;
}

function getFormatter(
  locale: string,
  currency: string,
  code: boolean,
): Intl.NumberFormat {
  const key = cacheKey(locale, currency, code);
  let f = formatterCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: code ? "code" : "narrowSymbol",
    });
    formatterCache.set(key, f);
  }
  return f;
}

/** true si el símbolo de la moneda es ambiguo (contiene "$" sin letras). */
function isAmbiguousSymbol(locale: string, currency: string): boolean {
  const parts = getFormatter(locale, currency, false).formatToParts(1);
  const sym = parts.find((p) => p.type === "currency")?.value ?? "";
  // "Bs", "€", "CHF" son inequívocos; "$", "US$", "$US" son ambiguos.
  return sym.includes("$");
}

const ambiguityCache = new Map<string, boolean>();

/**
 * Formatea un importe en la moneda indicada (ISO 4217).
 * Si la moneda no existe en el catálogo, se muestra el código tal cual.
 */
export function formatMoney(
  monto: number,
  moneda: string = "BOB",
  locale?: string,
): string {
  if (!Number.isFinite(monto)) return "—";
  const code = moneda.toUpperCase();
  if (!isCurrencyCode(code)) return `${monto.toFixed(2)} ${code}`;

  const loc = locale ?? "es";
  const aKey = `${loc}|${code}`;
  let ambiguous = ambiguityCache.get(aKey);
  if (ambiguous === undefined) {
    ambiguous = isAmbiguousSymbol(loc, code);
    ambiguityCache.set(aKey, ambiguous);
  }
  return getFormatter(loc, code, ambiguous).format(monto);
}

/** Formatea un importe mostrando siempre el código ISO (para desambiguar). */
export function formatMoneyCode(monto: number, moneda: string, locale?: string): string {
  if (!Number.isFinite(monto)) return "—";
  const code = moneda.toUpperCase();
  if (!isCurrencyCode(code)) return `${monto.toFixed(2)} ${code}`;
  return getFormatter(locale ?? "es", code, true).format(monto);
}

export function formatFecha(fechaISO: string, locale = "es") {
  const [y, m, d] = fechaISO.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatPct(valor: number, decimales = 1) {
  return `${valor.toFixed(decimales)}%`;
}

export function nombreMes(mesKey: string, locale = "es") {
  const [y, m] = mesKey.split("-").map(Number);
  return new Date(y, m - 1, 1)
    .toLocaleDateString(locale, { month: "short" })
    .replace(".", "");
}
