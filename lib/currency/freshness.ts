/**
 * Política de vigencia de cotizaciones.
 *
 * Distingue cuatro estados y nunca muestra una tasa antigua como si
 * fuera actual:
 * - vigente: el dato es del día o de ayer.
 * - anterior_vigente: el dato es el último publicado (típicamente del
 *   último día hábil: fines de semana y feriados no invalidan la tasa).
 * - desactualizada: demasiado antigua o marcada como expirada por la
 *   fuente; no se usa para convertir.
 * - no_disponible: no hay cotización o la fuente la marcó como
 *   no disponible; nunca se evalúa su fecha.
 *
 * Solo `status: "valid"` llega a la evaluación de frescura; ningún otro
 * estado puede clasificarse como usable. Las conversiones solo se
 * permiten con cotizaciones vigente o anterior_vigente.
 */
import type { ExchangeRateQuote } from "./rates";

export type QuoteFreshness =
  | "vigente"
  | "anterior_vigente"
  | "desactualizada"
  | "no_disponible";

export interface FreshnessPolicy {
  /** Días máximos para considerar el dato del día (o de ayer). */
  vigenteMaxDays: number;
  /**
   * Días máximos tolerados para el último valor publicado. Cubre un
   * fin de semana largo o un feriado sin invalidar la tasa.
   */
  anteriorMaxDays: number;
}

/** Política por defecto para fuentes con cadencia diaria. */
export const DEFAULT_FRESHNESS_POLICY: FreshnessPolicy = {
  vigenteMaxDays: 1,
  anteriorMaxDays: 4,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Fecha (UTC, YYYY-MM-DD) de publicación o, en su defecto, de consulta. */
function fechaDato(quote: ExchangeRateQuote): string | null {
  const raw = quote.publishedAt ?? quote.fetchedAt;
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function diasDeAntiguedad(fecha: string, now: Date): number | null {
  const t = Date.parse(`${fecha}T00:00:00Z`);
  if (!Number.isFinite(t)) return null;
  const hoy = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((hoy - t) / DAY_MS);
}

/**
 * Clasifica la cotización según la política de vigencia.
 * `now` es inyectable para pruebas deterministas.
 */
export function clasificarCotizacion(
  quote: ExchangeRateQuote | null,
  now: Date = new Date(),
  policy: FreshnessPolicy = DEFAULT_FRESHNESS_POLICY,
): QuoteFreshness {
  if (!quote) return "no_disponible";
  // Validación explícita de estados: solo "valid" se evalúa por fecha.
  if (quote.status === "unavailable") return "no_disponible";
  if (quote.status === "expired") return "desactualizada";
  const fecha = fechaDato(quote);
  if (!fecha) return "desactualizada";
  const age = diasDeAntiguedad(fecha, now);
  if (age === null || age < 0) return "desactualizada";
  if (age <= policy.vigenteMaxDays) return "vigente";
  if (age <= policy.anteriorMaxDays) return "anterior_vigente";
  return "desactualizada";
}

/** ¿La cotización puede usarse para convertir? */
export function cotizacionUsable(freshness: QuoteFreshness): boolean {
  return freshness === "vigente" || freshness === "anterior_vigente";
}
