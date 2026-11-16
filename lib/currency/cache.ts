/**
 * Caché de cotizaciones para evitar solicitudes innecesarias.
 *
 * - Guarda la última cotización por par de monedas con su fecha de
 *   consulta, en memoria y (si está disponible) en localStorage.
 * - TTL corto para resultados positivos (las tasas son diarias) y más
 *   corto para los negativos (evita martillear pares sin cobertura).
 * - La vigencia real del dato la decide RateFreshnessPolicy según la
 *   fecha de publicación, no la fecha de consulta: un dato del viernes
 *   sigue siendo válido el lunes.
 */
import type { ExchangeRateQuote } from "./rates";

export interface CacheEntry {
  /** null = el par no tuvo cobertura en la última consulta. */
  quote: ExchangeRateQuote | null;
  /** Fecha y hora (ISO 8601) de la última consulta al proveedor. */
  savedAt: string;
  /** TTL propio de la entrada (ms). */
  ttlMs: number;
}

export const RATES_CACHE_KEY = "platik:rates:v1";
/** 6 h: las tasas de referencia se publican una vez al día. */
export const POSITIVE_TTL_MS = 6 * 60 * 60 * 1000;
/** 10 min: no insistir con pares sin cobertura en cada render. */
export const NEGATIVE_TTL_MS = 10 * 60 * 1000;

const RATE_TYPES = new Set(["reference", "mid", "buy", "sell", "executable"]);
const RATE_STATUSES = new Set(["valid", "expired", "unavailable"]);

function esFechaIso(v: unknown): v is string {
  return typeof v === "string" && !Number.isNaN(Date.parse(v));
}

function esListaDeTextos(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((s) => typeof s === "string");
}

function storageAvailable(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export class RateCache {
  private readonly memory = new Map<string, CacheEntry>();

  constructor(
    private readonly storageKey: string = RATES_CACHE_KEY,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /**
   * Validación estructural completa de una cotización recuperada del
   * almacenamiento. Cualquier desviación (tipos, fechas inválidas,
   * estado desconocido, propiedades ausentes) descarta la entrada sin
   * lanzar errores: el par simplemente se vuelve a consultar.
   */
  private static isValidQuote(q: unknown): q is ExchangeRateQuote {
    if (!q || typeof q !== "object") return false;
    const o = q as Record<string, unknown>;
    if (typeof o.from !== "string" || o.from.length === 0) return false;
    if (typeof o.to !== "string" || o.to.length === 0) return false;
    if (typeof o.rate !== "number" || !Number.isFinite(o.rate) || o.rate <= 0) {
      return false;
    }
    if (typeof o.provider !== "string" || o.provider.length === 0) return false;
    if (typeof o.providerName !== "string" || o.providerName.length === 0) {
      return false;
    }
    if (!esFechaIso(o.fetchedAt)) return false;
    if (o.publishedAt !== undefined && !esFechaIso(o.publishedAt)) return false;
    if (o.validUntil !== undefined && !esFechaIso(o.validUntil)) return false;
    if (o.rateType !== undefined && !RATE_TYPES.has(o.rateType as string)) {
      return false;
    }
    if (!RATE_STATUSES.has(o.status as string)) return false;
    if (o.viaCurrency !== undefined && typeof o.viaCurrency !== "string") {
      return false;
    }
    if (o.underlyingProviders !== undefined && !esListaDeTextos(o.underlyingProviders)) {
      return false;
    }
    if (o.legs !== undefined) {
      if (!Array.isArray(o.legs)) return false;
      for (const leg of o.legs) {
        if (!leg || typeof leg !== "object") return false;
        const l = leg as Record<string, unknown>;
        if (typeof l.from !== "string" || l.from.length === 0) return false;
        if (typeof l.to !== "string" || l.to.length === 0) return false;
        if (typeof l.rate !== "number" || !Number.isFinite(l.rate) || l.rate <= 0) {
          return false;
        }
        if (typeof l.provider !== "string" || l.provider.length === 0) return false;
        if (typeof l.providerName !== "string" || l.providerName.length === 0) {
          return false;
        }
        if (l.publishedAt !== undefined && !esFechaIso(l.publishedAt)) return false;
        if (
          l.underlyingProviders !== undefined &&
          !esListaDeTextos(l.underlyingProviders)
        ) {
          return false;
        }
      }
    }
    return true;
  }

  private static isEntry(x: unknown): x is CacheEntry {
    if (!x || typeof x !== "object") return false;
    const e = x as Partial<CacheEntry>;
    // savedAt debe ser una fecha parseable: con NaN la comparación de TTL
    // nunca expiraría y la entrada quedaría válida para siempre.
    if (!esFechaIso(e.savedAt)) return false;
    if (
      typeof e.ttlMs !== "number" ||
      !Number.isFinite(e.ttlMs) ||
      e.ttlMs <= 0
    ) {
      return false;
    }
    if (e.quote === null) return true;
    return RateCache.isValidQuote(e.quote);
  }

  private loadStorage(): Record<string, CacheEntry> {
    const storage = storageAvailable();
    if (!storage) return {};
    try {
      const raw = storage.getItem(this.storageKey);
      if (!raw) return {};
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return {};
      const out: Record<string, CacheEntry> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (RateCache.isEntry(v)) out[k] = v;
      }
      return out;
    } catch {
      return {};
    }
  }

  private saveStorage() {
    const storage = storageAvailable();
    if (!storage) return;
    try {
      const all = this.loadStorage();
      for (const [k, v] of this.memory) all[k] = v;
      storage.setItem(this.storageKey, JSON.stringify(all));
    } catch {
      // Sin espacio o modo privado: el caché en memoria sigue funcionando.
    }
  }

  /** Entrada vigente para la clave, o null si no hay o expiró. */
  get(key: string): CacheEntry | null {
    const t = this.now();
    let entry = this.memory.get(key);
    if (!entry) {
      const stored = this.loadStorage()[key];
      if (stored) {
        this.memory.set(key, stored);
        entry = stored;
      }
    }
    if (!RateCache.isEntry(entry)) {
      // Entrada corrupta: se descarta sin errores ni efectos en los datos.
      this.memory.delete(key);
      return null;
    }
    if (t - Date.parse(entry.savedAt) >= entry.ttlMs) {
      this.memory.delete(key);
      return null;
    }
    return entry;
  }

  set(key: string, quote: ExchangeRateQuote | null) {
    // Defensa en profundidad: nunca se cachea una cotización que no
    // superaría la validación de recuperación.
    const seguro = quote !== null && !RateCache.isValidQuote(quote) ? null : quote;
    const entry: CacheEntry = {
      quote: seguro,
      savedAt: new Date(this.now()).toISOString(),
      ttlMs: seguro ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS,
    };
    this.memory.set(key, entry);
    this.saveStorage();
  }

  /** Última fecha de actualización conocida del caché (ISO), si existe. */
  ultimaActualizacion(): string | null {
    let max: string | null = null;
    for (const e of this.memory.values()) {
      if (!max || e.savedAt > max) max = e.savedAt;
    }
    if (max) return max;
    const stored = this.loadStorage();
    for (const e of Object.values(stored)) {
      if (!max || e.savedAt > max) max = e.savedAt;
    }
    return max;
  }
}
