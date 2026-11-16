import type { AporteStellar } from "./stellar/types";
import type { RateType } from "./currency/rates";

export type { AporteStellar } from "./stellar/types";

export type TxType = "ingreso" | "gasto" | "costo";

/** Perfil financiero del usuario en la modalidad "Comenzar desde cero". */
export type UserProfileType =
  | "independiente"
  | "freelancer"
  | "emprendedor"
  | "empresa";

/** Campos de equivalencia histórica guardados junto a un importe. */
export interface ConversionSnapshot {
  /** Importe equivalente en la moneda principal, si hubo cotización válida. */
  baseAmount?: number;
  /** Moneda principal vigente al registrar (ISO 4217). */
  baseCurrency?: string;
  /** Tasa aplicada (unidades de baseCurrency por 1 unidad de `moneda`). */
  exchangeRate?: number;
  /** Fuente de la cotización (ej. "frankfurter"). */
  exchangeRateSource?: string;
  /** Fecha ISO de la cotización utilizada. */
  exchangeRateDate?: string;
  /** Tipo de cotización aplicada (reference, mid, buy, sell, executable). */
  exchangeRateType?: RateType;
  /** Fecha de publicación del dato de cotización (ISO), si la fuente la define. */
  exchangeRatePublishedAt?: string;
}

/** Importe en una moneda ISO 4217 con equivalencia opcional ya calculada. */
export interface MonetaryAmount extends ConversionSnapshot {
  /** Importe en `moneda` (puede ser negativo en ajustes). */
  monto: number;
  /** Moneda ISO 4217 del importe. */
  moneda: string;
}

/**
 * Movimiento financiero ordinario. Los saldos de apertura y los ajustes
 * identificables viven aparte (`openingBalance` / `balanceAdjustments`) para
 * no contaminar los ingresos ni los egresos.
 */
export interface Transaction extends MonetaryAmount {
  id: string;
  tipo: TxType;
  categoria: string;
  descripcion: string;
  /** Fecha ISO (YYYY-MM-DD). */
  fecha: string;
}

/** Meta de ahorro en moneda fiduciaria (Bs, USD, MXN…). */
export interface Goal {
  id: string;
  nombre: string;
  montoObjetivo: number;
  ahorroAcumulado: number;
  /** Moneda ISO 4217 de la meta. */
  moneda: string;
  /** Fecha límite ISO (YYYY-MM-DD) opcional. */
  fechaObjetivo?: string;
}

/** Perfil financiero del negocio/usuario. */
export interface Profile {
  nombreNegocio: string;
  nombreUsuario: string;
  /** Moneda principal de trabajo (ISO 4217). */
  moneda: string;
  /** País ISO 3166-1 alpha-2 (opcional). */
  countryCode?: string;
  /** Moneda de visualización secundaria (opcional). */
  displayCurrency?: string;
  /** Preferencia de moneda principal elegida en onboarding. */
  currencyPreference?: "local" | "usd" | "custom";
  /** Modalidad de onboarding elegida (A/B/C), si aplica. */
  onboardingOption?: "bolivia" | "usd" | "world";
  /** Si el usuario ya completó el onboarding de moneda. */
  onboardingDone?: boolean;
  /** Tipo de usuario de la prueba personalizada (opcional). */
  tipoUsuario?: UserProfileType;
  /** Si ya completó la configuración inicial de la beta (perfil + saldo). */
  betaSetupDone?: boolean;
}

/** Categoría activa de la distribución del dinero disponible. */
export interface DistributionCategory {
  /** Identificador estable (clave del catálogo o personalizado antiguo). */
  key: string;
  nombre: string;
  descripcion: string;
  /** Porcentaje 0-100 del dinero disponible. */
  porcentaje: number;
}

/** Saldo de apertura: no es un ingreso ordinario. */
export interface OpeningBalance extends MonetaryAmount {
  id: string;
  /** Fecha ISO (YYYY-MM-DD) del saldo inicial. */
  fecha: string;
  descripcion: string;
}

/** Ajuste identificable y trazable del saldo disponible (monto con signo). */
export interface BalanceAdjustment extends MonetaryAmount {
  id: string;
  /** Fecha ISO (YYYY-MM-DD) del ajuste. */
  fecha: string;
  descripcion: string;
}

export interface PlatikData {
  transactions: Transaction[];
  goals: Goal[];
  profile: Profile;
  /** Categorías activas con su porcentaje; la fuente de verdad es esta lista. */
  distribution: DistributionCategory[];
  /** Saldo inicial de apertura, si el usuario lo registró. */
  openingBalance: OpeningBalance | null;
  /** Ajustes trazables del saldo disponible. */
  balanceAdjustments: BalanceAdjustment[];
  aportesStellar: AporteStellar[];
}
