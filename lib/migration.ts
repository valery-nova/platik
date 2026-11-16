/**
 * Migración compatible de los datos guardados en localStorage.
 * Nunca destructiva: conserva importes, monedas, metas históricas y la
 * distribución antigua (objeto fijo) convirtiéndola a categorías.
 */
import type {
  BalanceAdjustment,
  Goal,
  MonetaryAmount,
  OpeningBalance,
  PlatikData,
  Profile,
  Transaction,
  UserProfileType,
} from "./types";
import { isCountryCode, isCurrencyCode, suggestedCurrencyForCountry } from "./currency/catalog";
import { migrateDistributionCategories } from "./distribution";

const LEGACY_CURRENCY = "BOB";
const TIPOS_USUARIO = new Set<UserProfileType>([
  "independiente",
  "freelancer",
  "emprendedor",
  "empresa",
]);

function cleanCurrency(value: unknown, fallback: string): string {
  return typeof value === "string" && isCurrencyCode(value) ? value.toUpperCase() : fallback;
}

function cleanRateType(value: unknown): MonetaryAmount["exchangeRateType"] {
  const TIPOS = new Set(["reference", "mid", "buy", "sell", "executable"]);
  return typeof value === "string" && TIPOS.has(value)
    ? (value as MonetaryAmount["exchangeRateType"])
    : undefined;
}

function conversionFields(src: Partial<MonetaryAmount>, moneda: string): MonetaryAmount {
  const out: MonetaryAmount = { monto: 0, moneda };
  const baseCurrency = src.baseCurrency ? cleanCurrency(src.baseCurrency, moneda) : undefined;
  if (typeof src.baseAmount === "number" && Number.isFinite(src.baseAmount) && baseCurrency) {
    out.baseAmount = src.baseAmount;
    out.baseCurrency = baseCurrency;
  }
  if (typeof src.exchangeRate === "number" && Number.isFinite(src.exchangeRate) && src.exchangeRate > 0) {
    out.exchangeRate = src.exchangeRate;
  }
  if (typeof src.exchangeRateSource === "string" && src.exchangeRateSource) {
    out.exchangeRateSource = src.exchangeRateSource;
  }
  if (typeof src.exchangeRateDate === "string" && src.exchangeRateDate) {
    out.exchangeRateDate = src.exchangeRateDate;
  }
  const rateType = cleanRateType(src.exchangeRateType);
  if (rateType) out.exchangeRateType = rateType;
  if (typeof src.exchangeRatePublishedAt === "string" && src.exchangeRatePublishedAt) {
    out.exchangeRatePublishedAt = src.exchangeRatePublishedAt;
  }
  return out;
}

/** Normaliza una transacción antigua o nueva sin perder datos. */
export function migrateTransaction(tx: Partial<Transaction>): Transaction {
  const moneda = cleanCurrency(tx.moneda, LEGACY_CURRENCY);
  const out: Transaction = {
    ...conversionFields(tx, moneda),
    monto: typeof tx.monto === "number" && Number.isFinite(tx.monto) ? tx.monto : 0,
    id: String(tx.id ?? ""),
    tipo: tx.tipo === "ingreso" || tx.tipo === "gasto" || tx.tipo === "costo" ? tx.tipo : "gasto",
    categoria: typeof tx.categoria === "string" ? tx.categoria : "otros",
    descripcion: typeof tx.descripcion === "string" ? tx.descripcion : "",
    fecha: typeof tx.fecha === "string" ? tx.fecha : "",
    moneda,
  };
  return out;
}

/** Normaliza una meta conservando importe y moneda. */
export function migrateGoal(goal: Partial<Goal>): Goal {
  const moneda = cleanCurrency(goal.moneda, LEGACY_CURRENCY);
  return {
    id: String(goal.id ?? ""),
    nombre: typeof goal.nombre === "string" ? goal.nombre : "Meta",
    montoObjetivo: typeof goal.montoObjetivo === "number" && Number.isFinite(goal.montoObjetivo) ? goal.montoObjetivo : 0,
    ahorroAcumulado: typeof goal.ahorroAcumulado === "number" && Number.isFinite(goal.ahorroAcumulado) ? goal.ahorroAcumulado : 0,
    moneda,
    fechaObjetivo: typeof goal.fechaObjetivo === "string" && goal.fechaObjetivo ? goal.fechaObjetivo : undefined,
  };
}

/** Normaliza el perfil aplicando valores predeterminados razonables. */
export function migrateProfile(profile: Partial<Profile> | undefined): Profile {
  const moneda = cleanCurrency(profile?.moneda, LEGACY_CURRENCY);
  const countryCode =
    typeof profile?.countryCode === "string" && isCountryCode(profile.countryCode)
      ? profile.countryCode.toUpperCase()
      : undefined;
  const displayCurrency = profile?.displayCurrency
    ? cleanCurrency(profile.displayCurrency, moneda)
    : undefined;
  const tipoUsuario =
    typeof profile?.tipoUsuario === "string" && TIPOS_USUARIO.has(profile.tipoUsuario as UserProfileType)
      ? (profile.tipoUsuario as UserProfileType)
      : undefined;
  return {
    nombreNegocio: typeof profile?.nombreNegocio === "string" ? profile.nombreNegocio : "",
    nombreUsuario: typeof profile?.nombreUsuario === "string" ? profile.nombreUsuario : "",
    moneda,
    countryCode,
    displayCurrency,
    currencyPreference: profile?.currencyPreference,
    onboardingOption: profile?.onboardingOption,
    onboardingDone: profile?.onboardingDone === true,
    tipoUsuario,
    betaSetupDone: profile?.betaSetupDone === true,
  };
}

/** Aplica la moneda sugerida por el país cuando el perfil no tiene preferencia explícita. */
export function applyCountrySuggestion(profile: Profile): Profile {
  if (!profile.countryCode || profile.currencyPreference) return profile;
  const suggested = suggestedCurrencyForCountry(profile.countryCode);
  if (!suggested) return profile;
  return { ...profile, moneda: suggested, currencyPreference: "local" };
}

function migrateOpeningBalance(input: unknown): OpeningBalance | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Partial<OpeningBalance>;
  const moneda = cleanCurrency(o.moneda, LEGACY_CURRENCY);
  const monto = typeof o.monto === "number" && Number.isFinite(o.monto) && o.monto >= 0 ? o.monto : null;
  if (monto === null) return null;
  return {
    ...conversionFields(o, moneda),
    monto,
    moneda,
    id: String(o.id ?? "opening"),
    fecha: typeof o.fecha === "string" && o.fecha ? o.fecha : "",
    descripcion: typeof o.descripcion === "string" && o.descripcion ? o.descripcion : "Saldo de apertura",
  };
}

function migrateBalanceAdjustment(input: unknown): BalanceAdjustment | null {
  if (!input || typeof input !== "object") return null;
  const a = input as Partial<BalanceAdjustment>;
  const moneda = cleanCurrency(a.moneda, LEGACY_CURRENCY);
  const monto = typeof a.monto === "number" && Number.isFinite(a.monto) && a.monto !== 0 ? a.monto : null;
  if (monto === null) return null;
  return {
    ...conversionFields(a, moneda),
    monto,
    moneda,
    id: String(a.id ?? ""),
    fecha: typeof a.fecha === "string" && a.fecha ? a.fecha : "",
    descripcion: typeof a.descripcion === "string" && a.descripcion ? a.descripcion : "Ajuste de saldo",
  };
}

/** Migra un PlatikData completo de forma no destructiva. */
export function migrateData(data: Partial<PlatikData>): PlatikData {
  const transactions = Array.isArray(data.transactions)
    ? data.transactions.map((tx) => migrateTransaction(tx ?? {}))
    : [];
  const goals = Array.isArray(data.goals) ? data.goals.map((g) => migrateGoal(g ?? {})) : [];
  const profile = applyCountrySuggestion(migrateProfile(data.profile));
  const distribution = migrateDistributionCategories(data.distribution, profile.tipoUsuario);
  const openingBalance = migrateOpeningBalance(data.openingBalance);
  const balanceAdjustments = Array.isArray(data.balanceAdjustments)
    ? data.balanceAdjustments.map(migrateBalanceAdjustment).filter((a): a is BalanceAdjustment => a !== null)
    : [];
  const aportesStellar = Array.isArray(data.aportesStellar) ? data.aportesStellar : [];

  return {
    transactions,
    goals,
    profile,
    distribution,
    openingBalance,
    balanceAdjustments,
    aportesStellar,
  };
}
