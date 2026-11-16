/**
 * Proveedor de cotizaciones Frankfurter (API v2).
 *
 * - Sin API key y con CORS abierto: se consulta directo desde el navegador.
 * - Tasas de referencia (mid-market) de 112 bancos centrales y fuentes
 *   oficiales, incluidas las oficiales del BCB para BOB.
 * - Nunca inventa tasas: si el par no tiene cobertura o la respuesta no
 *   es válida, devuelve null y el movimiento queda pendiente.
 * - Solo lectura: no ejecuta ni simula operaciones de cambio.
 */
import type {
  ExchangeRateProvider,
  ExchangeRateQuote,
  RateType,
} from "./rates";

export const FRANKFURTER_BASE_URL = "https://api.frankfurter.dev";

/** Firma mínima de fetch, inyectable para pruebas deterministas. */
export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<Response>;

interface FrankfurterRateResponse {
  date?: unknown;
  base?: unknown;
  quote?: unknown;
  rate?: unknown;
  providers?: unknown;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class FrankfurterRateProvider implements ExchangeRateProvider {
  readonly id = "frankfurter";
  readonly name = "Frankfurter (tasas de referencia)";

  constructor(
    private readonly fetchImpl: FetchLike = (url, init) =>
      fetch(url, init),
    private readonly baseUrl: string = FRANKFURTER_BASE_URL,
    private readonly timeoutMs = 8000,
    private readonly retries = 1,
  ) {}

  /**
   * Cotización de `from` a `to` (unidades de `to` por 1 `from`).
   * Devuelve null si no hay cobertura, la respuesta es inválida o la
   * fuente no responde (timeout, error de red o 5xx tras reintentos).
   */
  async getRate(
    from: string,
    to: string,
    options?: { date?: string; signal?: AbortSignal },
  ): Promise<ExchangeRateQuote | null> {
    const f = from.toUpperCase();
    const t = to.toUpperCase();
    if (f === t) return null;

    let url = `${this.baseUrl}/v2/rate/${f}/${t}?expand=providers`;
    if (options?.date) url += `&date=${options.date}`;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const signal = options?.signal ?? AbortSignal.timeout(this.timeoutMs);
        const res = await this.fetchImpl(url, { signal });
        // Sin cobertura o petición inválida: no hay tasa, no es un fallo.
        if (res.status === 400 || res.status === 404 || res.status === 422) {
          return null;
        }
        if (!res.ok) throw new Error(`Frankfurter HTTP ${res.status}`);
        const data = (await res.json()) as FrankfurterRateResponse;
        return this.mapQuote(data, f, t);
      } catch {
        if (attempt === this.retries) return null;
        await sleep(400);
      }
    }
    return null;
  }

  /** Valida y normaliza la respuesta; null si no es confiable. */
  private mapQuote(
    data: FrankfurterRateResponse,
    from: string,
    to: string,
  ): ExchangeRateQuote | null {
    if (!data || typeof data !== "object") return null;
    const rate = data.rate;
    const date = data.date;
    const base = typeof data.base === "string" ? data.base.toUpperCase() : "";
    const quote = typeof data.quote === "string" ? data.quote.toUpperCase() : "";

    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
      return null;
    }
    if (typeof date !== "string" || !DATE_RE.test(date)) return null;
    if (base !== from || quote !== to) return null;

    const underlying = Array.isArray(data.providers)
      ? data.providers
          .map((p) =>
            p && typeof p === "object" && typeof (p as { key?: unknown }).key === "string"
              ? ((p as { key: string }).key as string)
              : null,
          )
          .filter((k): k is string => !!k)
          .slice(0, 8)
      : [];

    return {
      from,
      to,
      rate,
      provider: this.id,
      providerName: this.name,
      fetchedAt: new Date().toISOString(),
      publishedAt: date,
      rateType: "mid" satisfies RateType,
      underlyingProviders: underlying.length > 0 ? underlying : undefined,
      status: "valid",
    };
  }
}
