"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import type { AporteStellar } from "./stellar/types";
import type {
  BalanceAdjustment,
  DistributionCategory,
  Goal,
  OpeningBalance,
  PlatikData,
  Profile,
  Transaction,
} from "./types";
import { buildEmptyData } from "./demo-data";
import {
  dataKeyForMode,
  defaultPlatikData,
  LEGACY_KEY,
  MODE_KEY,
  readMode,
  readPlatik,
  SCHEMA_VERSION,
  writeMode,
  writePlatik,
  type PlatikMode,
} from "./storage";

type Action =
  | { type: "hydrate"; mode: PlatikMode; data: PlatikData; customized: boolean }
  | { type: "tx/add"; tx: Transaction }
  | { type: "tx/update"; tx: Transaction }
  | { type: "tx/delete"; id: string }
  | { type: "goal/add"; goal: Goal }
  | { type: "goal/update"; goal: Goal }
  | { type: "goal/delete"; id: string }
  | { type: "goal/aporte"; id: string; monto: number }
  | { type: "profile/update"; mode: PlatikMode; profile: Profile }
  | { type: "distribution/update"; distribution: DistributionCategory[] }
  | { type: "openingBalance/set"; mode: PlatikMode; openingBalance: OpeningBalance | null }
  | { type: "balanceAdjustment/add"; mode: PlatikMode; adjustment: BalanceAdjustment }
  | { type: "balanceAdjustment/delete"; id: string }
  | { type: "balanceAdjustment/update"; mode: PlatikMode; adjustment: BalanceAdjustment }
  | { type: "aporteStellar/upsert"; aporte: AporteStellar }
  | { type: "aporteStellar/delete"; id: string }
  | { type: "reset"; mode: PlatikMode };

interface State {
  mode: PlatikMode;
  data: PlatikData;
  /** true si el usuario ya modificó los datos del modo activo. */
  customized: boolean;
}

function withData(state: State, data: Partial<PlatikData>): State {
  return { ...state, data: { ...state.data, ...data }, customized: true };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { mode: action.mode, data: action.data, customized: action.customized };
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
        transactions: state.data.transactions.filter((t) => t.id !== action.id),
      });
    case "goal/add":
      return withData(state, { goals: [...state.data.goals, action.goal] });
    case "goal/update":
      return withData(state, {
        goals: state.data.goals.map((g) => (g.id === action.goal.id ? action.goal : g)),
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
      if (action.mode !== state.mode) return state;
      return withData(state, { profile: action.profile });
    case "distribution/update":
      return withData(state, { distribution: action.distribution });
    case "openingBalance/set":
      if (action.mode !== state.mode) return state;
      return withData(state, { openingBalance: action.openingBalance });
    case "balanceAdjustment/add":
      if (action.mode !== state.mode) return state;
      return withData(state, {
        balanceAdjustments: [action.adjustment, ...state.data.balanceAdjustments],
      });
    case "balanceAdjustment/delete":
      return withData(state, {
        balanceAdjustments: state.data.balanceAdjustments.filter(
          (a) => a.id !== action.id,
        ),
      });
    case "balanceAdjustment/update":
      if (action.mode !== state.mode) return state;
      return withData(state, {
        balanceAdjustments: state.data.balanceAdjustments.map((a) =>
          a.id === action.adjustment.id ? action.adjustment : a,
        ),
      });
    case "aporteStellar/upsert":
      return withData(state, {
        aportesStellar: state.data.aportesStellar.some((a) => a.id === action.aporte.id)
          ? state.data.aportesStellar.map((a) =>
              a.id === action.aporte.id ? action.aporte : a,
            )
          : [action.aporte, ...state.data.aportesStellar],
      });
    case "aporteStellar/delete":
      return withData(state, {
        aportesStellar: state.data.aportesStellar.filter((a) => a.id !== action.id),
      });
    case "reset":
      return {
        mode: action.mode,
        data: defaultPlatikData(action.mode),
        customized: false,
      };
    default:
      return state;
  }
}

interface Store {
  mode: PlatikMode;
  data: PlatikData;
  hydrated: boolean;
  switchMode: (mode: PlatikMode) => void;
  resetCurrent: () => void;
  addTransaction: (tx: Omit<Transaction, "id">) => void;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addGoal: (goal: Omit<Goal, "id">) => void;
  updateGoal: (goal: Goal) => void;
  deleteGoal: (id: string) => void;
  addAporte: (id: string, monto: number) => void;
  updateProfile: (profile: Profile) => void;
  updateDistribution: (distribution: DistributionCategory[]) => void;
  setOpeningBalance: (opening: Omit<OpeningBalance, "id"> | null) => void;
  addBalanceAdjustment: (adjustment: Omit<BalanceAdjustment, "id">) => void;
  deleteBalanceAdjustment: (id: string) => void;
  updateBalanceAdjustment: (adjustment: BalanceAdjustment) => void;
  upsertAporteStellar: (aporte: AporteStellar) => void;
  deleteAporteStellar: (id: string) => void;
}

const PlatikContext = createContext<Store | null>(null);

const INITIAL_STATE: State = { mode: "demo", data: buildEmptyData(), customized: false };

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadStateForMode(mode: PlatikMode): State {
  const storage = window.localStorage;
  const stored = readPlatik(storage, mode);
  if (mode === "demo") {
    // La demo no personalizada se regenera con fechas recientes; una copia
    // modificada por el usuario (customized) se respeta hasta restablecerla.
    if (stored?.customized) {
      return { mode, data: stored.data, customized: true };
    }
    return { mode, data: defaultPlatikData("demo"), customized: false };
  }
  if (stored) return { mode, data: stored.data, customized: stored.customized };
  return { mode, data: defaultPlatikData("beta"), customized: false };
}

export function PlatikProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [hydrated, setHydrated] = useReducer(() => true, false);

  useEffect(() => {
    try {
      dispatch({ type: "hydrate", ...loadStateForMode(readMode(window.localStorage)) });
    } catch {
      dispatch({ type: "hydrate", mode: "demo", data: defaultPlatikData("demo"), customized: false });
    }
    setHydrated();
  }, []);

  // Sincroniza con otras pestañas: cualquier cambio en las claves de PLATIK
  // recarga el estado del modo activo (evita mezclas entre modalidades).
  useEffect(() => {
    if (!hydrated) return;
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === MODE_KEY || e.key === LEGACY_KEY || e.key === dataKeyForMode(state.mode)) {
        window.location.reload();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [hydrated, state.mode]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      writePlatik(window.localStorage, state.mode, {
        version: SCHEMA_VERSION,
        data: state.data,
        customized: state.customized,
      });
    } catch {
      // Sin almacenamiento: la sesión sigue en memoria.
    }
  }, [state, hydrated]);

  const store = useMemo<Store>(
    () => ({
      mode: state.mode,
      data: state.data,
      hydrated,
      switchMode: (mode) => {
        try {
          writeMode(window.localStorage, mode);
          dispatch({ type: "hydrate", ...loadStateForMode(mode) });
        } catch {
          dispatch({ type: "hydrate", mode, data: defaultPlatikData(mode), customized: false });
        }
      },
      resetCurrent: () => dispatch({ type: "reset", mode: state.mode }),
      addTransaction: (tx) => dispatch({ type: "tx/add", tx: { ...tx, id: newId() } }),
      updateTransaction: (tx) => dispatch({ type: "tx/update", tx }),
      deleteTransaction: (id) => dispatch({ type: "tx/delete", id }),
      addGoal: (goal) => dispatch({ type: "goal/add", goal: { ...goal, id: newId() } }),
      updateGoal: (goal) => dispatch({ type: "goal/update", goal }),
      deleteGoal: (id) => dispatch({ type: "goal/delete", id }),
      addAporte: (id, monto) => dispatch({ type: "goal/aporte", id, monto }),
      updateProfile: (profile) => dispatch({ type: "profile/update", mode: state.mode, profile }),
      updateDistribution: (distribution) =>
        dispatch({ type: "distribution/update", distribution }),
      setOpeningBalance: (opening) =>
        dispatch({
          type: "openingBalance/set",
          mode: state.mode,
          openingBalance: opening ? { ...opening, id: newId() } : null,
        }),
      addBalanceAdjustment: (adjustment) =>
        dispatch({
          type: "balanceAdjustment/add",
          mode: state.mode,
          adjustment: { ...adjustment, id: newId() },
        }),
      updateBalanceAdjustment: (adjustment) =>
        dispatch({ type: "balanceAdjustment/update", mode: state.mode, adjustment }),
      deleteBalanceAdjustment: (id) => dispatch({ type: "balanceAdjustment/delete", id }),
      upsertAporteStellar: (aporte) =>
        dispatch({ type: "aporteStellar/upsert", aporte }),
      deleteAporteStellar: (id) => dispatch({ type: "aporteStellar/delete", id }),
    }),
    [state, hydrated],
  );

  return <PlatikContext.Provider value={store}>{children}</PlatikContext.Provider>;
}

export function usePlatik(): Store {
  const ctx = useContext(PlatikContext);
  if (!ctx) throw new Error("usePlatik debe usarse dentro de PlatikProvider");
  return ctx;
}
