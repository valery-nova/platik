/**
 * Persistencia local por modalidad. Cada modo tiene su propia clave para
 * que demostración y prueba personalizada nunca se mezclen.
 */
import type { PlatikData } from "./types";
import type { AporteStellar } from "./stellar/types";
import { buildDemoData, buildEmptyData } from "./demo-data";
import { migrateData } from "./migration";

export type PlatikMode = "demo" | "beta";

export const SCHEMA_VERSION = 1;
export const MODE_KEY = "platik:mode:v1";
export const LEGACY_KEY = "platik:data:v1";
export const DEMO_KEY = "platik:demo:v1";
export const BETA_KEY = "platik:beta:v1";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StoredPlatik {
  version: number;
  data: PlatikData;
  customized: boolean;
}

export function dataKeyForMode(mode: PlatikMode): string {
  return mode === "demo" ? DEMO_KEY : BETA_KEY;
}

export function defaultPlatikData(mode: PlatikMode): PlatikData {
  return mode === "demo" ? buildDemoData() : buildEmptyData();
}

export function readMode(storage: StorageLike): PlatikMode {
  try {
    const raw = storage.getItem(MODE_KEY);
    if (!raw) return "demo";
    const parsed: unknown = JSON.parse(raw);
    const mode = (parsed as { mode?: unknown })?.mode;
    return mode === "beta" ? "beta" : "demo";
  } catch {
    return "demo";
  }
}

export function writeMode(storage: StorageLike, mode: PlatikMode): void {
  try {
    storage.setItem(MODE_KEY, JSON.stringify({ mode, version: SCHEMA_VERSION }));
  } catch {
    // Sin espacio / modo privado: la sesión sigue en memoria.
  }
}

function isPlatikData(x: unknown): x is PlatikData {
  if (!x || typeof x !== "object") return false;
  const d = x as Partial<PlatikData>;
  return (
    !!d.profile &&
    typeof d.profile === "object" &&
    typeof d.profile.moneda === "string" &&
    Array.isArray(d.transactions) &&
    Array.isArray(d.goals) &&
    d.distribution !== undefined
  );
}

const ESTADOS_APORTE = new Set([
  "preparado",
  "firma_solicitada",
  "enviada",
  "confirmada",
  "fallida",
  "cancelada",
]);

function sanitizeAportes(d: PlatikData): PlatikData {
  const aportes = Array.isArray(d.aportesStellar)
    ? d.aportesStellar.filter(
        (a): a is AporteStellar =>
          !!a &&
          typeof a === "object" &&
          typeof a.id === "string" &&
          typeof a.goalId === "string" &&
          typeof a.walletOrigen === "string" &&
          typeof a.createdAt === "string" &&
          typeof a.importe === "number" &&
          Number.isFinite(a.importe) &&
          typeof a.estado === "string" &&
          ESTADOS_APORTE.has(a.estado as AporteStellar["estado"]),
      )
    : [];
  return { ...d, aportesStellar: aportes };
}

function parseStored(raw: string | null): StoredPlatik | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const wrapped = parsed as { data?: unknown; customized?: unknown; version?: unknown };
    const candidate = isPlatikData(wrapped?.data) ? wrapped.data : isPlatikData(parsed) ? parsed : null;
    if (!candidate) return null;
    return {
      version: SCHEMA_VERSION,
      data: migrateData(sanitizeAportes(candidate)),
      customized: wrapped && typeof wrapped === "object" && "customized" in wrapped
        ? wrapped.customized === true
        : true,
    };
  } catch {
    return null;
  }
}

/** Lee los datos de un modo; para demo incluye el legado platik:data:v1. */
export function readPlatik(storage: StorageLike, mode: PlatikMode): StoredPlatik | null {
  const own = parseStored(storage.getItem(dataKeyForMode(mode)));
  if (own) return own;
  if (mode === "demo") return parseStored(storage.getItem(LEGACY_KEY));
  return null;
}

export function writePlatik(storage: StorageLike, mode: PlatikMode, state: StoredPlatik): void {
  try {
    storage.setItem(
      dataKeyForMode(mode),
      JSON.stringify({ version: SCHEMA_VERSION, data: state.data, customized: state.customized }),
    );
  } catch {
    // Sin espacio / modo privado: la sesión sigue funcionando en memoria.
  }
}

export function clearPlatik(storage: StorageLike, mode: PlatikMode): void {
  try {
    storage.removeItem(dataKeyForMode(mode));
  } catch {
    // noop
  }
}
