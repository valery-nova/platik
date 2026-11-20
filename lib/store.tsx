"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import type { AporteStellar, DepositoUsdc } from "./stellar/types";
import type {
  BalanceAdjustment,
  DistributionCategory,
  Goal,
  OpeningBalance,
  PlatikData,
  Profile,
  Transaction,
  UserProfileType,
} from "./types";
import { defaultDistributionForProfile } from "./distribution";
import { buildEmptyData } from "./demo-data";
import {
  dataKeyForMode,
  dataKeyForSpace,
  defaultPlatikData,
  LEGACY_KEY,
  MAX_VENTURES,
  MODE_KEY,
  PERSONAL_SPACE,
  claimUsdcDeposit,
  readMode,
  readPlatik,
  readSpaces,
  releaseUsdcDeposit,
  releaseUsdcDepositsForSpace,
  SCHEMA_VERSION,
  spacesKeyForMode,
  writeMode,
  usdcDepositOwners,
  writePlatik,
  writeSpaces,
  type PlatikMode,
  type SpacesState,
  type VentureSpace,
  type VentureType,
} from "./storage";

interface Target {
  mode: PlatikMode;
  spaceId: string;
}

type MutationAction =
  | { type: "tx/add"; tx: Transaction; target: Target }
  | { type: "tx/update"; tx: Transaction; target: Target }
  | { type: "tx/delete"; id: string; target: Target }
  | { type: "goal/add"; goal: Goal; target: Target }
  | { type: "goal/update"; goal: Goal; target: Target }
  | { type: "goal/delete"; id: string; target: Target }
  | { type: "goal/aporte"; id: string; monto: number; target: Target }
  | { type: "profile/update"; profile: Profile; target: Target }
  | { type: "distribution/update"; distribution: DistributionCategory[]; target: Target }
  | { type: "openingBalance/set"; openingBalance: OpeningBalance | null; target: Target }
  | { type: "balanceAdjustment/add"; adjustment: BalanceAdjustment; target: Target }
  | { type: "balanceAdjustment/delete"; id: string; target: Target }
  | { type: "balanceAdjustment/update"; adjustment: BalanceAdjustment; target: Target }
  | { type: "aporteStellar/upsert"; aporte: AporteStellar; target: Target }
  | { type: "aporteStellar/delete"; id: string; target: Target }
  | { type: "depositoUsdc/upsert"; deposito: DepositoUsdc; target: Target }
  | { type: "depositoUsdc/delete"; id: string; target: Target }
  | { type: "reset"; target: Target };

type Action = { type: "hydrate"; state: Loaded } | MutationAction;

interface Loaded {
  mode: PlatikMode;
  spaces: SpacesState;
  data: PlatikData;
  customized: boolean;
}

type State = Loaded;

function withData(state: State, data: Partial<PlatikData>): State {
  return { ...state, data: { ...state.data, ...data }, customized: true };
}

function reducer(state: State, action: Action): State {
  if (action.type === "hydrate") return action.state;
  if (action.target.mode !== state.mode || action.target.spaceId !== state.spaces.active) {
    return state;
  }
  switch (action.type) {
    case "tx/add":
      return withData(state, { transactions: [action.tx, ...state.data.transactions] });
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
          g.id === action.id ? { ...g, ahorroAcumulado: g.ahorroAcumulado + action.monto } : g,
        ),
      });
    case "profile/update":
      return withData(state, { profile: action.profile });
    case "distribution/update":
      return withData(state, { distribution: action.distribution });
    case "openingBalance/set":
      return withData(state, { openingBalance: action.openingBalance });
    case "balanceAdjustment/add":
      return withData(state, {
        balanceAdjustments: [action.adjustment, ...state.data.balanceAdjustments],
      });
    case "balanceAdjustment/delete":
      return withData(state, {
        balanceAdjustments: state.data.balanceAdjustments.filter((a) => a.id !== action.id),
      });
    case "balanceAdjustment/update":
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
    case "depositoUsdc/upsert":
      return withData(state, {
        depositosUsdc: state.data.depositosUsdc.some((d) => d.id === action.deposito.id)
          ? state.data.depositosUsdc.map((d) =>
              d.id === action.deposito.id ? action.deposito : d,
            )
          : [action.deposito, ...state.data.depositosUsdc],
      });
    case "depositoUsdc/delete":
      return withData(state, {
        depositosUsdc: state.data.depositosUsdc.filter((d) => d.id !== action.id),
      });
    case "reset":
      return {
        ...state,
        data: resetDataForSpace(state),
        customized: false,
      };
    default:
      return state;
  }
}

interface Store {
  mode: PlatikMode;
  data: PlatikData;
  spaces: SpacesState;
  ventures: VentureSpace[];
  activeSpaceId: string;
  activeSpaceName: string;
  activeSpaceType: "personal" | VentureType;
  canCreateVenture: boolean;
  hydrated: boolean;
  switchMode: (mode: PlatikMode) => void;
  resetCurrent: () => void;
  selectSpace: (spaceId: string) => void;
  createVenture: (nombre: string, tipo: VentureType) => boolean;
  renameVenture: (id: string, nombre: string) => void;
  deleteVenture: (id: string) => void;
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
  upsertDepositoUsdc: (deposito: DepositoUsdc) => void;
  deleteDepositoUsdc: (id: string) => void;
}

const PlatikContext = createContext<Store | null>(null);

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Carga el espacio indicado (o el último usado del modo) dentro de su modalidad. */
function loadSpace(mode: PlatikMode, spaceId: string): Loaded {
  const storage = window.localStorage;
  let spaces = readSpaces(storage, mode);
  if (!spaces.ventures.some((v) => v.id === spaces.active) && spaces.active !== PERSONAL_SPACE) {
    spaces = { ...spaces, active: PERSONAL_SPACE };
  }
  const validId = spaceId === PERSONAL_SPACE || spaces.ventures.some((v) => v.id === spaceId)
    ? spaceId
    : spaces.active;
  spaces = { ...spaces, active: validId };

  const stored = readPlatik(storage, mode, validId);
  let data: PlatikData;
  let customized = false;
  if (validId !== PERSONAL_SPACE && !stored) {
    const personalProfile = readPlatik(storage, mode, PERSONAL_SPACE)?.data.profile ?? defaultPlatikData(mode).profile;
    const venture = spaces.ventures.find((v) => v.id === validId);
    data = seedVentureData(
      { ...buildEmptyData(), profile: personalProfile },
      venture?.nombre ?? "Mi emprendimiento",
      venture?.tipo,
    );
  } else if (stored) {
    data = stored.data;
    customized = stored.customized;
    if (mode === "demo" && validId === PERSONAL_SPACE && !customized) {
      // La demo no personalizada se regenera con fechas recientes.
      data = defaultPlatikData("demo");
      customized = false;
    }
  } else {
    data = defaultPlatikData(mode);
  }
  const depositOwners = usdcDepositOwners(storage, mode, spaces);
  if (depositOwners.size > 0) {
    data = {
      ...data,
      depositosUsdc: data.depositosUsdc.filter((d) => {
        const owner = depositOwners.get(d.id);
        return owner === undefined || owner === validId;
      }),
    };
  }
  return { mode, spaces, data, customized };
}

function loadMode(mode: PlatikMode): Loaded {
  return loadSpace(mode, readSpaces(window.localStorage, mode).active);
}

const VENTURE_TIPO_USUARIO: Record<VentureType, UserProfileType> = {
  emprendimiento: "emprendedor",
  negocio: "empresa",
  freelance: "freelancer",
};

function tipoUsuarioForVenture(tipo: VentureType): UserProfileType {
  return VENTURE_TIPO_USUARIO[tipo] ?? "emprendedor";
}

function seedVentureData(base: PlatikData, nombre: string, tipo: VentureType = "emprendimiento"): PlatikData {
  const tipoUsuario = tipoUsuarioForVenture(tipo);
  return {
    ...base,
    distribution: defaultDistributionForProfile(tipoUsuario),
    transactions: [],
    goals: [],
    openingBalance: null,
    balanceAdjustments: [],
    aportesStellar: [],
    depositosUsdc: [],
    profile: {
      ...base.profile,
      nombreNegocio: nombre,
      tipoUsuario,
      onboardingDone: true,
      betaSetupDone: true,
    },
  };
}

function resetDataForSpace(state: State): PlatikData {
  const venture = state.spaces.ventures.find((v) => v.id === state.spaces.active);
  if (!venture) return defaultPlatikData(state.mode);
  const tipoUsuario = tipoUsuarioForVenture(venture.tipo);
  return {
    ...buildEmptyData(),
    profile: {
      ...state.data.profile,
      nombreNegocio: venture.nombre,
      tipoUsuario,
      onboardingDone: true,
      betaSetupDone: true,
    },
    distribution: defaultDistributionForProfile(tipoUsuario),
  };
}

const INITIAL: State = {
  mode: "demo",
  spaces: { active: PERSONAL_SPACE, ventures: [] },
  data: buildEmptyData(),
  customized: false,
};

export function PlatikProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [hydrated, setHydrated] = useReducer(() => true, false);
  const activeTargetRef = useRef<Target>({ mode: state.mode, spaceId: state.spaces.active });

  useEffect(() => {
    activeTargetRef.current = { mode: state.mode, spaceId: state.spaces.active };
  }, [state.mode, state.spaces.active]);

  useEffect(() => {
    try {
      dispatch({ type: "hydrate", state: loadMode(readMode(window.localStorage)) });
    } catch {
      dispatch({ type: "hydrate", state: { ...INITIAL, data: defaultPlatikData("demo") } });
    }
    setHydrated();
    // Solo al montar: el estado se hidrata una vez desde localStorage.
  }, []);

  // Persistencia: el espacio activo se guarda en su propia clave; los
  // emprendimientos se registran en la clave de espacios del modo.
  useEffect(() => {
    if (!hydrated) return;
    try {
      writePlatik(
        window.localStorage,
        state.mode,
        { version: SCHEMA_VERSION, data: state.data, customized: state.customized },
        state.spaces.active,
      );
      writeSpaces(window.localStorage, state.mode, state.spaces);
    } catch {
      // Sin almacenamiento: la sesión sigue en memoria.
    }
  }, [state, hydrated]);

  // Sincroniza con otras pestañas.
  useEffect(() => {
    if (!hydrated) return;
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      const relevant = [
        MODE_KEY,
        LEGACY_KEY,
        dataKeyForMode(state.mode),
        spacesKeyForMode(state.mode),
        dataKeyForSpace(state.mode, state.spaces.active),
      ];
      if (relevant.includes(e.key)) window.location.reload();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [hydrated, state.mode, state.spaces.active]);

  const store = useMemo<Store>(() => {
    const target: Target = { mode: state.mode, spaceId: state.spaces.active };
    const activeVenture = state.spaces.ventures.find((v) => v.id === state.spaces.active);
    const go = (next: Loaded) => {
      writeSpaces(window.localStorage, next.mode, next.spaces);
      writePlatik(
        window.localStorage,
        next.mode,
        { version: SCHEMA_VERSION, data: next.data, customized: next.customized },
        next.spaces.active,
      );
      dispatch({ type: "hydrate", state: next });
    };
    return {
      mode: state.mode,
      data: state.data,
      spaces: state.spaces,
      ventures: state.spaces.ventures,
      activeSpaceId: state.spaces.active,
      activeSpaceName: activeVenture?.nombre ?? "Personal",
      activeSpaceType: activeVenture?.tipo ?? "personal",
      canCreateVenture: state.spaces.ventures.length < MAX_VENTURES,
      hydrated,
      switchMode: (mode) => {
        try {
          writeMode(window.localStorage, mode);
          go(loadMode(mode));
        } catch {
          go({ mode, spaces: { active: PERSONAL_SPACE, ventures: [] }, data: defaultPlatikData(mode), customized: false });
        }
      },
      resetCurrent: () => {
        try {
          for (const d of state.data.depositosUsdc) {
            releaseUsdcDeposit(window.localStorage, state.mode, d.id, state.spaces.active);
          }
        } catch {
          // noop
        }
        dispatch({ type: "reset", target });
      },
      selectSpace: (spaceId) => go(loadSpace(state.mode, spaceId)),
      createVenture: (nombre, tipo) => {
        if (state.spaces.ventures.length >= MAX_VENTURES) return false;
        const clean = nombre.trim().slice(0, 60);
        if (clean.length < 2) return false;
        const id = `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const venture: VentureSpace = { id, nombre: clean, tipo };
        const spaces = { active: id, ventures: [...state.spaces.ventures, venture] };
        let personalProfile =
          state.spaces.active === PERSONAL_SPACE
            ? state.data.profile
            : defaultPlatikData(state.mode).profile;
        if (state.spaces.active !== PERSONAL_SPACE) {
          try {
            personalProfile =
              readPlatik(window.localStorage, state.mode, PERSONAL_SPACE)?.data.profile ?? personalProfile;
          } catch {
            // noop
          }
        }
        const data = seedVentureData({ ...buildEmptyData(), profile: personalProfile }, clean, tipo);
        go({ mode: state.mode, spaces, data, customized: false });
        return true;
      },
      renameVenture: (id, nombre) => {
        const clean = nombre.trim().slice(0, 60);
        if (clean.length < 2) return;
        const spaces = {
          ...state.spaces,
          ventures: state.spaces.ventures.map((v) => (v.id === id ? { ...v, nombre: clean } : v)),
        };
        writeSpaces(window.localStorage, state.mode, spaces);
        dispatch({ type: "hydrate", state: { ...state, spaces } });
      },
      deleteVenture: (id) => {
        if (!state.spaces.ventures.some((v) => v.id === id)) return;
        const spaces: SpacesState = {
          active: state.spaces.active === id ? PERSONAL_SPACE : state.spaces.active,
          ventures: state.spaces.ventures.filter((v) => v.id !== id),
        };
        try {
          window.localStorage.removeItem(dataKeyForSpace(state.mode, id));
          releaseUsdcDepositsForSpace(window.localStorage, state.mode, id);
        } catch {
          // noop
        }
        writeSpaces(window.localStorage, state.mode, spaces);
        go(loadSpace(state.mode, spaces.active));
      },
      addTransaction: (tx) => dispatch({ type: "tx/add", tx: { ...tx, id: newId() }, target }),
      updateTransaction: (tx) => dispatch({ type: "tx/update", tx, target }),
      deleteTransaction: (id) => dispatch({ type: "tx/delete", id, target }),
      addGoal: (goal) => dispatch({ type: "goal/add", goal: { ...goal, id: newId() }, target }),
      updateGoal: (goal) => dispatch({ type: "goal/update", goal, target }),
      deleteGoal: (id) => dispatch({ type: "goal/delete", id, target }),
      addAporte: (id, monto) => dispatch({ type: "goal/aporte", id, monto, target }),
      updateProfile: (profile) => dispatch({ type: "profile/update", profile, target }),
      updateDistribution: (distribution) => dispatch({ type: "distribution/update", distribution, target }),
      setOpeningBalance: (opening) =>
        dispatch({
          type: "openingBalance/set",
          openingBalance: opening ? { ...opening, id: newId() } : null,
          target,
        }),
      addBalanceAdjustment: (adjustment) =>
        dispatch({
          type: "balanceAdjustment/add",
          adjustment: { ...adjustment, id: newId() },
          target,
        }),
      updateBalanceAdjustment: (adjustment) =>
        dispatch({ type: "balanceAdjustment/update", adjustment, target }),
      deleteBalanceAdjustment: (id) => dispatch({ type: "balanceAdjustment/delete", id, target }),
      upsertAporteStellar: (aporte) => dispatch({ type: "aporteStellar/upsert", aporte, target }),
      deleteAporteStellar: (id) => dispatch({ type: "aporteStellar/delete", id, target }),
      upsertDepositoUsdc: (deposito) => {
        const latest = activeTargetRef.current;
        if (latest.mode !== target.mode || latest.spaceId !== target.spaceId) return;
        let owned = true;
        try {
          owned = claimUsdcDeposit(window.localStorage, target.mode, deposito.id, target.spaceId);
        } catch {
          owned = true;
        }
        if (!owned) {
          if (state.data.depositosUsdc.some((d) => d.id === deposito.id)) {
            dispatch({ type: "depositoUsdc/delete", id: deposito.id, target });
          }
          return;
        }
        dispatch({ type: "depositoUsdc/upsert", deposito, target });
      },
      deleteDepositoUsdc: (id) => {
        try {
          releaseUsdcDeposit(window.localStorage, target.mode, id, target.spaceId);
        } catch {
          // noop
        }
        dispatch({ type: "depositoUsdc/delete", id, target });
      },
    };
  }, [state, hydrated]);

  return <PlatikContext.Provider value={store}>{children}</PlatikContext.Provider>;
}

export function usePlatik(): Store {
  const ctx = useContext(PlatikContext);
  if (!ctx) throw new Error("usePlatik debe usarse dentro de PlatikProvider");
  return ctx;
}
