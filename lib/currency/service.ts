/**
 * Motor global de cotizaciones de PLATIK.
 *
 * Orquesta proveedor, caché y política de vigencia, y construye tasas
 * cruzadas con trazabilidad cuando no existe cotización directa fiable.
 *
 * Reglas inviolables:
 * - Nunca inventa equivalencias: sin cotización válida devuelve
 *   no_disponible y el movimiento queda pendiente.
 * - No convierte con cotizaciones desactualizadas.
 * - Una tasa cruzada solo se construye con patas de la misma fuente,
 *   misma fecha de publicación y mismo tipo de tasa; si no, es pendiente.
 * - Los snapshots históricos de los movimientos nunca se recalculan aquí.
 */
import { isCurrencyCode } from "./catalog";
import { multiplyDecimals } from "./decimal";
import { RateCache } from "./cache";
import { FrankfurterRateProvider } from "./frankfurter";
import {
  clasificarCotizacion,
  cotizacionUsable,
  DEFAULT_FRESHNESS_POLICY,
  type FreshnessPolicy,
  type QuoteFreshness,
} from "./freshness";
import type {
  ExchangeRateLeg,
  ExchangeRateProvider,
  ExchangeRateQuote,
} from "./rates";

export interface QuoteResult {
  quote: ExchangeRateQuote | null;
  freshness: QuoteFreshness;
}

/** Monedas pivote candidatas para tasas cruzadas, en orden de preferencia. */
const PIVOT_CURRENCIES = ["USD", "EUR"];

/** Ranking de frescura: menor = peor. */
const FRESHNESS_RANK: Record<QuoteFreshness, number> = {
  no_disponible: 0,
  desactualizada: 1,
  anterior_vigente: 2,
  vigente: 3,
};

function peorFrescura(a: QuoteFreshness, b: QuoteFreshness): QuoteFreshness {
  return FRESHNESS_RANK[a] <= FRESHNESS_RANK[b] ? a : b;
}

function tipoTasa(q: ExchangeRateQuote): string {
  return q.rateType ?? "reference";
}

/** Dos patas solo son combinables si comparten fuente, fecha y tipo. */
function patasCompatibles(a: ExchangeRateQuote, b: ExchangeRateQuote): boolean {
  if (a.provider !== b.provider) return false;
  if (!a.publishedAt || !b.publishedAt) return false;
  if (a.publishedAt !== b.publishedAt) return false;
  return tipoTasa(a) === tipoTasa(b);
}

function aPata(q: ExchangeRateQuote): ExchangeRateLeg {
  return {
    from: q.from,
    to: q.to,
    rate: q.rate,
    provider: q.provider,
    providerName: q.providerName,
    publishedAt: q.publishedAt,
  };
}

export class RateService {
  constructor(
    private provider: ExchangeRateProvider,
    private readonly cache: RateCache = new RateCache(),
    private readonly policy: FreshnessPolicy = DEFAULT_FRESHNESS_POLICY,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Cambia el proveedor (pruebas u otra fuente futura). */
  setProvider(provider: ExchangeRateProvider): void {
    this.provider = provider;
  }

  /** Última actualización registrada en el caché (ISO), si existe. */
  ultimaActualizacion(): string | null {
    return this.cache.ultimaActualizacion();
  }

  private cacheKey(from: string, to: string, date?: string): string {
    // La fecha forma parte de la clave: una cotización histórica nunca se
    // devuelve como si fuera la actual, ni viceversa.
    return `${from}|${to}|${date ?? ""}`;
  }

  /**
   * Cotización directa con caché, sin clasificación ni tasas cruzadas.
   * Es la única vía de acceso a red del servicio.
   */
  private async directQuote(
    from: string,
    to: string,
    options?: { date?: string; force?: boolean },
  ): Promise<ExchangeRateQuote | null> {
    const f = from.toUpperCase();
    const t = to.toUpperCase();
    if (f === t) return null;
    if (!isCurrencyCode(f) || !isCurrencyCode(t)) return null;

    const key = this.cacheKey(f, t, options?.date);
    if (!options?.force) {
      const cached = this.cache.get(key);
      if (cached) return cached.quote;
    }
    let quote: ExchangeRateQuote | null;
    try {
      quote = await this.provider.getRate(
        f,
        t,
        options?.date ? { date: options.date } : undefined,
      );
    } catch {
      // Un proveedor que falla nunca corrompe los datos: se trata como
      // "sin cotización" y no se guarda en caché para permitir reintento.
      return null;
    }
    this.cache.set(key, quote);
    return quote;
  }

  /**
   * Cotización utilizable para `from` → `to`.
   * - Directa fresca: se devuelve tal cual.
   * - Sin directa (o desactualizada): se intenta tasa cruzada por USD/EUR
   *   con patas compatibles; si no, queda pendiente.
   */
  async quote(
    from: string,
    to: string,
    options?: { force?: boolean; date?: string },
  ): Promise<QuoteResult> {
    const f = from.toUpperCase();
    const t = to.toUpperCase();
    if (f === t || !isCurrencyCode(f) || !isCurrencyCode(t)) {
      return { quote: null, freshness: "no_disponible" };
    }

    const direct = await this.directQuote(f, t, options);
    if (direct) {
      const freshness = clasificarCotizacion(direct, this.now(), this.policy);
      if (cotizacionUsable(freshness)) {
        return { quote: { ...direct, status: "valid" }, freshness };
      }
    }

    const cross = await this.crossQuote(f, t, options);
    if (cross) return cross;

    if (direct) {
      // Existe el dato pero no cumple la vigencia: no se convierte.
      return { quote: { ...direct, status: "expired" }, freshness: "desactualizada" };
    }
    return { quote: null, freshness: "no_disponible" };
  }

  /** Tasa cruzada vía moneda pivote, con trazabilidad de las patas. */
  private async crossQuote(
    from: string,
    to: string,
    options?: { force?: boolean; date?: string },
  ): Promise<QuoteResult | null> {
    for (const pivot of PIVOT_CURRENCIES) {
      if (pivot === from || pivot === to) continue;
      const [leg1, leg2] = await Promise.all([
        this.directQuote(from, pivot, options),
        this.directQuote(pivot, to, options),
      ]);
      if (!leg1 || !leg2) continue;
      if (!patasCompatibles(leg1, leg2)) continue;

      const freshness = peorFrescura(
        clasificarCotizacion(leg1, this.now(), this.policy),
        clasificarCotizacion(leg2, this.now(), this.policy),
      );
      if (!cotizacionUsable(freshness)) continue;

      let rate: number;
      try {
        rate = multiplyDecimals(leg1.rate, leg2.rate);
      } catch {
        continue;
      }
      if (!Number.isFinite(rate) || rate <= 0) continue;

      const underlying = [
        ...new Set([
          ...(leg1.underlyingProviders ?? []),
          ...(leg2.underlyingProviders ?? []),
        ]),
      ].slice(0, 8);

      const quote: ExchangeRateQuote = {
        from,
        to,
        rate,
        provider: leg1.provider,
        providerName: `${leg1.providerName} · tasa cruzada vía ${pivot}`,
        fetchedAt: this.now().toISOString(),
        publishedAt: leg1.publishedAt,
        rateType: leg1.rateType,
        viaCurrency: pivot,
        legs: [aPata(leg1), aPata(leg2)],
        underlyingProviders: underlying.length > 0 ? underlying : undefined,
        status: "valid",
      };
      return { quote, freshness };
    }
    return null;
  }
}

let instance: RateService | null = null;

/**
 * Servicio global activo. Por defecto usa Frankfurter (tasas de
 * referencia oficiales); en pruebas se inyecta un proveedor simulado.
 */
export function getRateService(): RateService {
  if (!instance) {
    instance = new RateService(new FrankfurterRateProvider(), new RateCache());
  }
  return instance;
}

/** Reasigna el servicio activo (pruebas o configuración futura). */
export function setRateService(service: RateService | null): void {
  instance = service;
}
