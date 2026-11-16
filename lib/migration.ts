/**
 * Migración compatible de los datos guardados en localStorage.
 * Nunca destructiva: conserva importes, monedas y metas históricas.
 * Los registros antiguos sin moneda se asumen BOB (su moneda original).
 */
import type { Goal, PlatikData, Profile, Transaction } from "./types";
import { isCountryCode, isCurrencyCode, suggestedCurrencyForCountry } from "./currency/catalog";

const LEGACY_CURRENCY = "BOB";

function cleanCurrency(value: unknown, fallback: string): string {
  return typeof value === "string" && isCurrencyCode(value) ? value.toUpperCase() : fallback;
}

/** Normaliza una transacción antigua o nueva sin perder datos. */
export function migrateTransaction(tx: Partial<Transaction>): Transaction {
  const moneda = cleanCurrency(tx.moneda, LEGACY_CURRENCY);
  const baseCurrency = tx.baseCurrency ? cleanCurrency(tx.baseCurrency, moneda) : undefined;
  const out: Transaction = {
    id: String(tx.id ?? ""),
    tipo: tx.tipo === "ingreso" || tx.tipo === "gasto" || tx.tipo === "costo" ? tx.tipo : "gasto",
    monto: typeof tx.monto === "number" && Number.isFinite(tx.monto) ? tx.monto : 0,
    categoria: typeof tx.categoria === "string" ? tx.categoria : "otros",
    descripcion: typeof tx.descripcion === "string" ? tx.descripcion : "",
    fecha: typeof tx.fecha === "string" ? tx.fecha : "",
    moneda,
  };
  // Conversión histórica: solo se conserva si es coherente y tiene tasa válida.
  if (typeof tx.baseAmount === "number" && Number.isFinite(tx.baseAmount) && baseCurrency) {
    out.baseAmount = tx.baseAmount;
    out.baseCurrency = baseCurrency;
  }
  if (typeof tx.exchangeRate === "number" && Number.isFinite(tx.exchangeRate) && tx.exchangeRate > 0) {
    out.exchangeRate = tx.exchangeRate;
  }
  if (typeof tx.exchangeRateSource === "string" && tx.exchangeRateSource) {
    out.exchangeRateSource = tx.exchangeRateSource;
  }
  if (typeof tx.exchangeRateDate === "string" && tx.exchangeRateDate) {
    out.exchangeRateDate = tx.exchangeRateDate;
  }
  // Trazabilidad ampliada (Fase 8): tipo de tasa y fecha de publicación.
  const TIPOS_TASA = new Set(["reference", "mid", "buy", "sell", "executable"]);
  if (typeof tx.exchangeRateType === "string" && TIPOS_TASA.has(tx.exchangeRateType)) {
    out.exchangeRateType = tx.exchangeRateType as Transaction["exchangeRateType"];
  }
  if (typeof tx.exchangeRatePublishedAt === "string" && tx.exchangeRatePublishedAt) {
    out.exchangeRatePublishedAt = tx.exchangeRatePublishedAt;
  }
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

  return {
    nombreNegocio: typeof profile?.nombreNegocio === "string" ? profile.nombreNegocio : "",
    nombreUsuario: typeof profile?.nombreUsuario === "string" ? profile.nombreUsuario : "",
    moneda,
    countryCode,
    displayCurrency,
    currencyPreference: profile?.currencyPreference,
    onboardingOption: profile?.onboardingOption,
    onboardingDone: profile?.onboardingDone === true,
  };
}

/**
 * Aplica la moneda sugerida por el país cuando el perfil no tiene una
 * preferencia explícita. No pisa elecciones del usuario.
 */
export function applyCountrySuggestion(profile: Profile): Profile {
  if (!profile.countryCode || profile.currencyPreference) return profile;
  const suggested = suggestedCurrencyForCountry(profile.countryCode);
  if (!suggested) return profile;
  return { ...profile, moneda: suggested, currencyPreference: "local" };
}

/** Migra un PlatikData completo de forma no destructiva. */
export function migrateData(data: Partial<PlatikData>): PlatikData {
  const transactions = Array.isArray(data.transactions)
    ? data.transactions.map((tx) => migrateTransaction(tx ?? {}))
    : [];
  const goals = Array.isArray(data.goals) ? data.goals.map((g) => migrateGoal(g ?? {})) : [];
  const profile = applyCountrySuggestion(migrateProfile(data.profile));

  const distribution = data.distribution ?? { operacion: 50, reinversion: 30, ahorro: 20 };
  const aportesStellar = Array.isArray(data.aportesStellar) ? data.aportesStellar : [];

  return {
    transactions,
    goals,
    profile,
    distribution: {
      operacion: typeof distribution.operacion === "number" ? distribution.operacion : 50,
      reinversion: typeof distribution.reinversion === "number" ? distribution.reinversion : 30,
      ahorro: typeof distribution.ahorro === "number" ? distribution.ahorro : 20,
    },
    aportesStellar,
  };
}
