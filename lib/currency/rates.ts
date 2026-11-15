/**
 * Proveedor de cotizaciones desacoplado.
 *
 * PLATIK nunca inventa tasas: si una fuente no está disponible, el
 * proveedor devuelve null y el movimiento se registra con su moneda
 * original, marcado como pendiente de conversión.
 *
 * Fuentes previstas (Fase 8 integrará la automática):
 * - BOB: Banco Central de Bolivia (referencia oficial).
 * - USD/EUR y pares globales: fuentes oficiales por país/bloque.
 * - Otras monedas: fuente oficial del país emisor cuando exista.
 */
import { isCurrencyCode, currencyDigits } from "./catalog";
import { applyRate } from "./decimal";

export type RateStatus = "valid" | "expired" | "unavailable";

export interface ExchangeRateQuote {
  /** Moneda origen (ISO 4217). */
  from: string;
  /** Moneda destino (ISO 4217). */
  to: string;
  /** Unidades de `to` por 1 unidad de `from`. */
  rate: number;
  /** Identificador estable de la fuente (ej. "bcb-bo"). */
  provider: string;
  /** Nombre legible de la fuente. */
  providerName: string;
  /** Fecha y hora (ISO 8601) en que se consultó la fuente. */
  fetchedAt: string;
  /** Fecha de vigencia de la cotización (ISO 8601), si la fuente la define. */
  validUntil?: string;
  status: RateStatus;
}

export interface ExchangeRateProvider {
  readonly id: string;
  readonly name: string;
  /**
   * Devuelve la cotización o null si la fuente no está disponible.
   * Nunca debe inventar ni devolver una tasa fija no verificada.
   */
  getRate(
    from: string,
    to: string,
    options?: { date?: string; signal?: AbortSignal },
  ): Promise<ExchangeRateQuote | null>;
}

/**
 * Proveedor por defecto: no hay integración automática en esta fase.
 * Devuelve null siempre, de modo que los movimientos multi-moneda se
 * registran con su moneda original y quedan pendientes de conversión.
 */
export class UnavailableRateProvider implements ExchangeRateProvider {
  readonly id = "none";
  readonly name = "Sin proveedor de cotizaciones";

  async getRate(): Promise<ExchangeRateQuote | null> {
    return null;
  }
}

/**
 * Proveedor manual: el usuario (o una fase futura) aporta la tasa con su
 * fuente y fecha. Se usa para registrar equivalencias verificadas sin
 * inventar valores. La tasa se valida antes de aceptarla.
 */
export class ManualRateProvider implements ExchangeRateProvider {
  readonly id = "manual";
  readonly name = "Tasa ingresada manualmente";

  constructor(private readonly quote: ExchangeRateQuote | null) {}

  async getRate(from: string, to: string): Promise<ExchangeRateQuote | null> {
    if (!this.quote) return null;
    if (this.quote.from !== from || this.quote.to !== to) return null;
    if (!Number.isFinite(this.quote.rate) || this.quote.rate <= 0) return null;
    return this.quote;
  }
}

let activeProvider: ExchangeRateProvider = new UnavailableRateProvider();

/** Proveedor activo (por defecto, ninguno hasta que Fase 8 lo configure). */
export function getExchangeRateProvider(): ExchangeRateProvider {
  return activeProvider;
}

/** Permite registrar un proveedor (Fase 8 lo usará con fuentes reales). */
export function setExchangeRateProvider(provider: ExchangeRateProvider): void {
  activeProvider = provider;
}

export interface ConversionFields {
  baseAmount?: number;
  baseCurrency?: string;
  exchangeRate?: number;
  exchangeRateSource?: string;
  exchangeRateDate?: string;
}

/**
 * Construye los campos de conversión de un movimiento.
 * - Misma moneda: no requiere conversión (campos vacíos).
 * - Sin cotización válida: no se inventa equivalencia (campos vacíos).
 * - Con cotización: guarda la equivalencia exacta usada al registrar.
 */
export function buildConversionFields(
  fromCurrency: string,
  baseCurrency: string,
  amount: number,
  quote: ExchangeRateQuote | null,
): ConversionFields {
  const from = fromCurrency.toUpperCase();
  const to = baseCurrency.toUpperCase();
  if (from === to) return {};
  if (!quote || quote.status !== "valid") return {};
  if (quote.from.toUpperCase() !== from || quote.to.toUpperCase() !== to) return {};
  if (!isCurrencyCode(from) || !isCurrencyCode(to)) return {};
  if (!Number.isFinite(quote.rate) || quote.rate <= 0) return {};
  return {
    baseAmount: applyRate(amount, quote.rate, currencyDigits(to)),
    baseCurrency: to,
    exchangeRate: quote.rate,
    exchangeRateSource: quote.provider,
    exchangeRateDate: quote.fetchedAt,
  };
}
