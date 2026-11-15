/**
 * Aritmética decimal segura para dinero.
 * Trabaja sobre cadenas decimales y BigInt para evitar el polvo de punto
 * flotante (0.1 + 0.2) y redondea half-up en los límites de precisión.
 */

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);
const TEN = BigInt(10);
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

function pow10(n: number): bigint {
  return TEN ** BigInt(n);
}

interface ParsedDecimal {
  neg: boolean;
  int: string;
  frac: string;
}

/**
 * Number#toString() usa notación exponencial para valores muy pequeños o
 * grandes (0.0000001 → "1e-7"). La expandimos a decimal plano para que el
 * parser de dinero la acepte sin lanzar excepciones.
 */
function expandExponential(n: number): string {
  const s = n.toString();
  if (!/[eE]/.test(s)) return s;
  const [mantissa, expStr] = s.split(/[eE]/);
  const exp = Number.parseInt(expStr, 10);
  const neg = mantissa.startsWith("-");
  const [intPart, fracPart = ""] = (neg ? mantissa.slice(1) : mantissa).split(".");
  const digits = intPart + fracPart;
  const point = intPart.length + exp;
  let out: string;
  if (point <= 0) {
    out = `0.${"0".repeat(-point)}${digits}`;
  } else if (point >= digits.length) {
    out = digits + "0".repeat(point - digits.length);
  } else {
    out = `${digits.slice(0, point)}.${digits.slice(point)}`;
  }
  return `${neg ? "-" : ""}${out}`;
}

function parseDecimal(value: number | string): ParsedDecimal {
  const str =
    typeof value === "number" ? expandExponential(value).trim() : value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(str)) throw new Error(`Importe no válido: ${str}`);
  const neg = str.startsWith("-");
  const [int, frac = ""] = (neg ? str.slice(1) : str).split(".");
  return { neg, int: int || "0", frac };
}

/**
 * Convierte a BigInt escalado por 10^decimals, redondeando half-up si el
 * valor tiene más decimales de los pedidos (se mira el primer dígito
 * descartado, igual que el redondeo monetario habitual).
 */
function toScaled(value: number | string, decimals: number): bigint {
  const { neg, int, frac } = parseDecimal(value);
  const kept = frac.slice(0, decimals).padEnd(decimals, "0");
  let roundUp = false;
  if (frac.length > decimals) {
    roundUp = frac[decimals] >= "5";
  }
  const scale = pow10(decimals);
  let scaled = BigInt(int) * scale + BigInt(kept || "0");
  if (roundUp) scaled += ONE;
  return neg ? -scaled : scaled;
}

/** BigInt escalado → número con exactamente `decimals` decimales (exacto). */
function fromScaled(scaled: bigint, decimals: number): number {
  const neg = scaled < ZERO;
  const abs = neg ? -scaled : scaled;
  if (abs > MAX_SAFE) throw new Error("Importe fuera del rango seguro.");
  const s = abs.toString().padStart(decimals + 1, "0");
  const out =
    decimals === 0
      ? s
      : `${s.slice(0, -decimals)}.${s.slice(-decimals)}`;
  return Number(`${neg ? "-" : ""}${out}`);
}

/** División con redondeo half-up (para productos de tasa × importe). */
function divRoundHalfUp(n: bigint, d: bigint): bigint {
  const neg = n < ZERO;
  const a = neg ? -n : n;
  const q = a / d;
  const r = a % d;
  const rounded = r * TWO >= d ? q + ONE : q;
  return neg ? -rounded : rounded;
}

/** Suma importes y devuelve el total redondeado a los decimales dados. */
export function sumAmounts(amounts: number[], digits: number): number {
  let total = ZERO;
  for (const a of amounts) total += toScaled(a, digits);
  return fromScaled(total, digits);
}

/**
 * Convierte un importe multiplicándolo por una tasa y redondeando half-up
 * al número de decimales de la moneda destino.
 */
export function applyRate(
  amount: number,
  rate: number,
  digits: number,
  rateDecimals = 8,
): number {
  if (!Number.isFinite(amount) || !Number.isFinite(rate)) {
    throw new Error("Importe o tasa no válidos.");
  }
  // amount escalado a digits+rateDecimals, rate a rateDecimals:
  // producto escalado a digits + 2*rateDecimals; dividimos por
  // 10^(2*rateDecimals) para volver a la escala de `digits`.
  const amountScaled = toScaled(amount, digits + rateDecimals);
  const rateScaled = toScaled(rate, rateDecimals);
  const product = amountScaled * rateScaled;
  const scaled = divRoundHalfUp(product, pow10(2 * rateDecimals));
  return fromScaled(scaled, digits);
}

/**
 * Redondea un importe al número de decimales de su moneda (half-up).
 * Se usa al registrar movimientos para no arrastrar más precisión de la
 * que la moneda permite.
 */
export function roundToCurrency(amount: number, digits: number): number {
  return fromScaled(toScaled(amount, digits), digits);
}
