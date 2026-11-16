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

  private static isEntry(x: unknown): x is CacheEntry {
    if (!x || typeof x !== "object") return false;
    const e = x as Partial<CacheEntry>;
    return (
      typeof e.savedAt === "string" &&
      typeof e.ttlMs === "number" &&
      (e.quote === null || (typeof e.quote === "object" && e.quote !== null))
    );
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
    if (!entry) return null;
    if (t - Date.parse(entry.savedAt) >= entry.ttlMs) {
      this.memory.delete(key);
      return null;
    }
    return entry;
  }

  set(key: string, quote: ExchangeRateQuote | null) {
    const entry: CacheEntry = {
      quote,
      savedAt: new Date(this.now()).toISOString(),
      ttlMs: quote ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS,
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
