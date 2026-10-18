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
  | { type: "hydrate"; data: PlatikData }
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

function reducer(state: PlatikData, action: Action): PlatikData {
  switch (action.type) {
    case "hydrate":
      return action.data;
    case "tx/add":
      return { ...state, transactions: [action.tx, ...state.transactions] };
    case "tx/update":
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.tx.id ? action.tx : t,
        ),
      };
    case "tx/delete":
      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== action.id),
      };
    case "goal/add":
      return { ...state, goals: [...state.goals, action.goal] };
    case "goal/update":
      return {
        ...state,
        goals: state.goals.map((g) => (g.id === action.goal.id ? action.goal : g)),
      };
    case "goal/delete":
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id) };
    case "goal/aporte":
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.id
            ? { ...g, ahorroAcumulado: g.ahorroAcumulado + action.monto }
            : g,
        ),
      };
    case "profile/update":
      return { ...state, profile: action.profile };
    case "distribution/update":
      return { ...state, distribution: action.distribution };
    case "reset":
      return buildDemoData();
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

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function PlatikProvider({ children }: { children: React.ReactNode }) {
  const [data, dispatch] = useReducer(reducer, EMPTY_DATA);
  const [hydrated, setHydrated] = useReducer(() => true, false);

  useEffect(() => {
    let next = buildDemoData();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) next = JSON.parse(raw);
    } catch {
      // Datos corruptos: se mantiene la demostración.
    }
    dispatch({ type: "hydrate", data: next });
    setHydrated();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Sin espacio / modo privado: la sesión sigue funcionando en memoria.
    }
  }, [data, hydrated]);

  const store = useMemo<Store>(
    () => ({
      data,
      hydrated,
      addTransaction: (tx) => dispatch({ type: "tx/add", tx: { ...tx, id: newId() } }),
      updateTransaction: (tx) => dispatch({ type: "tx/update", tx }),
      deleteTransaction: (id) => dispatch({ type: "tx/delete", id }),
      addGoal: (goal) => dispatch({ type: "goal/add", goal: { ...goal, id: newId() } }),
      updateGoal: (goal) => dispatch({ type: "goal/update", goal }),
      deleteGoal: (id) => dispatch({ type: "goal/delete", id }),
      addAporte: (id, monto) => dispatch({ type: "goal/aporte", id, monto }),
      updateProfile: (profile) => dispatch({ type: "profile/update", profile }),
      updateDistribution: (distribution) =>
        dispatch({ type: "distribution/update", distribution }),
      resetDemo: () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* sin persistencia */
        }
        dispatch({ type: "reset" });
      },
    }),
    [data, hydrated],
  );

  return <PlatikContext.Provider value={store}>{children}</PlatikContext.Provider>;
}

export function usePlatik(): Store {
  const ctx = useContext(PlatikContext);
  if (!ctx) throw new Error("usePlatik debe usarse dentro de PlatikProvider");
  return ctx;
}
