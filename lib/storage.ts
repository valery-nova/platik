/**
 * Persistencia local por modalidad. Cada modo tiene su propia clave para
 * que demostración y prueba personalizada nunca se mezclen.
 */
import type { PlatikData } from "./types";
import type { AporteStellar, DepositoUsdc } from "./stellar/types";
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

/** Espacio personal: usa la clave histórica del modo (compatibilidad total). */
export const PERSONAL_SPACE = "personal";
export const MAX_VENTURES = 2;

export type VentureType = "emprendimiento" | "negocio" | "freelance";

export interface VentureSpace {
  id: string;
  nombre: string;
  tipo: VentureType;
}

export interface SpacesState {
  /** Espacio activo: PERSONAL_SPACE o el id de un emprendimiento. */
  active: string;
  ventures: VentureSpace[];
}

const VENTURE_TYPES = new Set<VentureType>(["emprendimiento", "negocio", "freelance"]);

export function spacesKeyForMode(mode: PlatikMode): string {
  return `platik:spaces:${mode}:v1`;
}

/** Clave de datos de un espacio; el personal conserva la clave original. */
export function dataKeyForSpace(mode: PlatikMode, spaceId: string = PERSONAL_SPACE): string {
  return spaceId === PERSONAL_SPACE
    ? dataKeyForMode(mode)
    : `${dataKeyForMode(mode)}:space:${spaceId}`;
}

export function readSpaces(storage: StorageLike, mode: PlatikMode): SpacesState {
  try {
    const raw = storage.getItem(spacesKeyForMode(mode));
    if (!raw) return { active: PERSONAL_SPACE, ventures: [] };
    const parsed = JSON.parse(raw) as Partial<SpacesState>;
    const ventures = Array.isArray(parsed.ventures)
      ? parsed.ventures
          .filter(
            (v): v is VentureSpace =>
              !!v &&
              typeof v.id === "string" &&
              /^[a-zA-Z0-9-]{1,64}$/.test(v.id) &&
              v.id !== PERSONAL_SPACE &&
              typeof v.nombre === "string" &&
              VENTURE_TYPES.has(v.tipo),
          )
          .slice(0, MAX_VENTURES)
      : [];
    const active =
      typeof parsed.active === "string" && ventures.some((v) => v.id === parsed.active)
        ? parsed.active
        : PERSONAL_SPACE;
    return { active, ventures };
  } catch {
    return { active: PERSONAL_SPACE, ventures: [] };
  }
}

export function writeSpaces(storage: StorageLike, mode: PlatikMode, spaces: SpacesState): void {
  try {
    storage.setItem(spacesKeyForMode(mode), JSON.stringify(spaces));
  } catch {
    // noop
  }
}

/** Índice global por modo: depósito USDC -> espacio que lo registró. */
export function usdcDepositsIndexKeyForMode(mode: PlatikMode): string {
  return `platik:usdc-deposits:${mode}:v1`;
}

export function readUsdcDepositIndex(storage: StorageLike, mode: PlatikMode): Record<string, string> {
  try {
    const raw = storage.getItem(usdcDepositsIndexKeyForMode(mode));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [id, space] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof space === "string" && space) out[id] = space;
    }
    return out;
  } catch {
    return {};
  }
}

function writeUsdcDepositIndex(storage: StorageLike, mode: PlatikMode, index: Record<string, string>): void {
  try {
    storage.setItem(usdcDepositsIndexKeyForMode(mode), JSON.stringify(index));
  } catch {
    // noop
  }
}

/**
 * Reclama un depósito para un espacio. Devuelve false si otro espacio ya lo
 * registró: así la misma wallet no puede contar el mismo pago en dos espacios.
 */
export function claimUsdcDeposit(
  storage: StorageLike,
  mode: PlatikMode,
  depositId: string,
  spaceId: string,
): boolean {
  const index = readUsdcDepositIndex(storage, mode);
  const owner = index[depositId];
  if (owner && owner !== spaceId) return false;
  if (owner !== spaceId) {
    index[depositId] = spaceId;
    writeUsdcDepositIndex(storage, mode, index);
  }
  return true;
}

export function releaseUsdcDeposit(
  storage: StorageLike,
  mode: PlatikMode,
  depositId: string,
  spaceId: string,
): void {
  const index = readUsdcDepositIndex(storage, mode);
  if (index[depositId] !== spaceId) return;
  delete index[depositId];
  writeUsdcDepositIndex(storage, mode, index);
}

export function releaseUsdcDepositsForSpace(storage: StorageLike, mode: PlatikMode, spaceId: string): void {
  const index = readUsdcDepositIndex(storage, mode);
  let changed = false;
  for (const id of Object.keys(index)) {
    if (index[id] === spaceId) {
      delete index[id];
      changed = true;
    }
  }
  if (changed) writeUsdcDepositIndex(storage, mode, index);
}

/**
 * Dueño de cada depósito conocido en el modo. El índice explícito manda;
 * para datos antiguos sin índice se usa prioridad Personal y luego el orden
 * de los emprendimientos, de modo que duplicados históricos se limpien.
 */
export function usdcDepositOwners(
  storage: StorageLike,
  mode: PlatikMode,
  spaces: SpacesState,
): Map<string, string> {
  const ordered = [PERSONAL_SPACE, ...spaces.ventures.map((v) => v.id)];
  const validSpaces = new Set(ordered);
  const owners = new Map<string, string>();
  for (const [id, space] of Object.entries(readUsdcDepositIndex(storage, mode))) {
    if (validSpaces.has(space)) owners.set(id, space);
  }
  for (const spaceId of ordered) {
    const stored = readPlatik(storage, mode, spaceId);
    for (const d of stored?.data.depositosUsdc ?? []) {
      if (!owners.has(d.id)) owners.set(d.id, spaceId);
    }
  }
  return owners;
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

const ESTADOS_DEPOSITO = new Set(["pendiente", "confirmado", "fallido"]);

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

function sanitizeDepositos(d: PlatikData): PlatikData {
  const depositos = Array.isArray(d.depositosUsdc)
    ? d.depositosUsdc.filter(
        (x): x is DepositoUsdc =>
          !!x &&
          typeof x === "object" &&
          typeof x.id === "string" &&
          typeof x.walletAddress === "string" &&
          typeof x.destinationAddress === "string" &&
          typeof x.txHash === "string" &&
          typeof x.createdAt === "string" &&
          typeof x.importe === "number" &&
          Number.isFinite(x.importe) &&
          typeof x.estado === "string" &&
          ESTADOS_DEPOSITO.has(x.estado as DepositoUsdc["estado"]),
      )
    : [];
  return { ...d, depositosUsdc: depositos };
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
      data: migrateData(sanitizeDepositos(sanitizeAportes(candidate))),
      customized: wrapped && typeof wrapped === "object" && "customized" in wrapped
        ? wrapped.customized === true
        : true,
    };
  } catch {
    return null;
  }
}

/** Lee los datos de un modo; para demo incluye el legado platik:data:v1. */
export function readPlatik(
  storage: StorageLike,
  mode: PlatikMode,
  spaceId: string = PERSONAL_SPACE,
): StoredPlatik | null {
  const own = parseStored(storage.getItem(dataKeyForSpace(mode, spaceId)));
  if (own) return own;
  if (mode === "demo" && spaceId === PERSONAL_SPACE) return parseStored(storage.getItem(LEGACY_KEY));
  return null;
}

export function writePlatik(
  storage: StorageLike,
  mode: PlatikMode,
  state: StoredPlatik,
  spaceId: string = PERSONAL_SPACE,
): void {
  try {
    storage.setItem(
      dataKeyForSpace(mode, spaceId),
      JSON.stringify({ version: SCHEMA_VERSION, data: state.data, customized: state.customized }),
    );
  } catch {
    // Sin espacio / modo privado: la sesión sigue funcionando en memoria.
  }
}

export function clearPlatik(
  storage: StorageLike,
  mode: PlatikMode,
  spaceId: string = PERSONAL_SPACE,
): void {
  try {
    storage.removeItem(dataKeyForSpace(mode, spaceId));
  } catch {
    // noop
  }
}
