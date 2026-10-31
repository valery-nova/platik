"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import type {
  Distribution,
  Goal,
  PlatikData,
  Profile,
  Transaction,
} from "./types";
import { buildDemoData } from "./demo-data";

const STORAGE_KEY = "platik:data:v1";

type Action =
  | { type: "hydrate"; data: PlatikData; customized: boolean }
  | { type: "tx/add"; tx: Transaction }
  | { type: "tx/update"; tx: Transaction }
  | { type: "tx/delete"; id: string }
  | { type: "goal/add"; goal: Goal }
  | { type: "goal/update"; goal: Goal }
  | { type: "goal/delete"; id: string }
  | { type: "goal/aporte"; id: string; monto: number }
  | { type: "profile/update"; profile: Profile }
  | { type: "distribution/update"; distribution: Distribution }
  | { type: "reset" };

interface State {
  data: PlatikData;
  /** true si el usuario ya modificó los datos de demostración. */
  customized: boolean;
}

function withData(state: State, data: Partial<PlatikData>): State {
  return { data: { ...state.data, ...data }, customized: true };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { data: action.data, customized: action.customized };
    case "tx/add":
      return withData(state, {
        transactions: [action.tx, ...state.data.transactions],
      });
    case "tx/update":
      return withData(state, {
        transactions: state.data.transactions.map((t) =>
          t.id === action.tx.id ? action.tx : t,
        ),
      });
    case "tx/delete":
      return withData(state, {
        transactions: state.data.transactions.filter(
          (t) => t.id !== action.id,
        ),
      });
    case "goal/add":
      return withData(state, { goals: [...state.data.goals, action.goal] });
    case "goal/update":
      return withData(state, {
        goals: state.data.goals.map((g) =>
          g.id === action.goal.id ? action.goal : g,
        ),
      });
    case "goal/delete":
      return withData(state, {
        goals: state.data.goals.filter((g) => g.id !== action.id),
      });
    case "goal/aporte":
      return withData(state, {
        goals: state.data.goals.map((g) =>
          g.id === action.id
            ? { ...g, ahorroAcumulado: g.ahorroAcumulado + action.monto }
            : g,
        ),
      });
    case "profile/update":
      return withData(state, { profile: action.profile });
    case "distribution/update":
      return withData(state, { distribution: action.distribution });
    case "reset":
      return { data: buildDemoData(), customized: false };
    default:
      return state;
  }
}

interface Store {
  data: PlatikData;
  hydrated: boolean;
  addTransaction: (tx: Omit<Transaction, "id">) => void;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addGoal: (goal: Omit<Goal, "id">) => void;
  updateGoal: (goal: Goal) => void;
  deleteGoal: (id: string) => void;
  addAporte: (id: string, monto: number) => void;
  updateProfile: (profile: Profile) => void;
  updateDistribution: (distribution: Distribution) => void;
  resetDemo: () => void;
}

const PlatikContext = createContext<Store | null>(null);

/** Estado inicial sin fechas: seguro para el prerender (cacheComponents). */
const EMPTY_DATA: PlatikData = {
  transactions: [],
  goals: [],
  profile: { nombreNegocio: "", nombreUsuario: "", moneda: "BOB" },
  distribution: { operacion: 55, reinversion: 25, ahorro: 20 },
};

const INITIAL_STATE: State = { data: EMPTY_DATA, customized: false };

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Valida que lo guardado tenga la forma completa de PlatikData. */
function isPlatikData(x: unknown): x is PlatikData {
  if (!x || typeof x !== "object") return false;
  const d = x as Partial<PlatikData>;
  return (
    !!d.profile &&
    typeof d.profile === "object" &&
    typeof d.profile.moneda === "string" &&
    Array.isArray(d.transactions) &&
    Array.isArray(d.goals) &&
    !!d.distribution &&
    typeof d.distribution === "object"
  );
}

/** La fase 1 solo admite BOB: corrige perfiles heredados en otra moneda. */
function normalizarMoneda(d: PlatikData): PlatikData {
  return d.profile.moneda === "BOB"
    ? d
    : { ...d, profile: { ...d.profile, moneda: "BOB" } };
}

/** Lee el almacenamiento; devuelve null si falta o es inválido. */
function readStored(): State | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    // Formato actual: { data, customized }
    const wrapped = parsed as { data?: unknown; customized?: unknown };
    if (isPlatikData(wrapped?.data)) {
      return {
        data: normalizarMoneda(wrapped.data),
        customized: wrapped.customized === true,
      };
    }
    // Legado v1 (sin envoltura): se trata como datos propios del usuario
    if (isPlatikData(parsed)) {
      return { data: normalizarMoneda(parsed), customized: true };
    }
    return null;
  } catch {
    return null;
  }
}

function writeStored(state: State) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ data: state.data, customized: state.customized }),
    );
  } catch {
    // Sin espacio / modo privado: la sesión sigue funcionando en memoria.
  }
}

export function PlatikProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [hydrated, setHydrated] = useReducer(() => true, false);

  useEffect(() => {
    const stored = readStored();
    // Si el usuario nunca personalizó, regeneramos la demo con fechas
    // recientes; si la tocó, respetamos sus datos tal como quedaron.
    const next = stored?.customized
      ? stored
      : { data: buildDemoData(), customized: false };
    dispatch({ type: "hydrate", data: next.data, customized: next.customized });
    setHydrated();

    // Sincroniza con otras pestañas abiertas.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const s = readStored();
      if (s) {
        dispatch({ type: "hydrate", data: s.data, customized: s.customized });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (hydrated) writeStored(state);
  }, [state, hydrated]);

  const store = useMemo<Store>(
    () => ({
      data: state.data,
      hydrated,
      addTransaction: (tx) =>
        dispatch({ type: "tx/add", tx: { ...tx, id: newId() } }),
      updateTransaction: (tx) => dispatch({ type: "tx/update", tx }),
      deleteTransaction: (id) => dispatch({ type: "tx/delete", id }),
      addGoal: (goal) =>
        dispatch({ type: "goal/add", goal: { ...goal, id: newId() } }),
      updateGoal: (goal) => dispatch({ type: "goal/update", goal }),
      deleteGoal: (id) => dispatch({ type: "goal/delete", id }),
      addAporte: (id, monto) => dispatch({ type: "goal/aporte", id, monto }),
      updateProfile: (profile) => dispatch({ type: "profile/update", profile }),
      updateDistribution: (distribution) =>
        dispatch({ type: "distribution/update", distribution }),
      resetDemo: () => dispatch({ type: "reset" }),
    }),
    [state.data, hydrated],
  );

  return (
    <PlatikContext.Provider value={store}>{children}</PlatikContext.Provider>
  );
}

export function usePlatik(): Store {
  const ctx = useContext(PlatikContext);
  if (!ctx) throw new Error("usePlatik debe usarse dentro de PlatikProvider");
  return ctx;
}
