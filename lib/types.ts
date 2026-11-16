import type { AporteStellar } from "./stellar/types";
import type { RateType } from "./currency/rates";

export type { AporteStellar } from "./stellar/types";

export type TxType = "ingreso" | "gasto" | "costo";

/**
 * Movimiento financiero. Cada registro guarda su propia moneda y, si en
 * el momento del registro existía una cotización válida hacia la moneda
 * principal, la equivalencia utilizada (nunca se recalcula después).
 */
export interface Transaction {
  id: string;
  tipo: TxType;
  /** Importe en la moneda del movimiento (`moneda`). */
  monto: number;
  categoria: string;
  descripcion: string;
  /** Fecha ISO (YYYY-MM-DD). */
  fecha: string;
  /** Moneda ISO 4217 del movimiento. */
  moneda: string;
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

/** Perfil financiero del negocio. */
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
}

/** Reparto de la ganancia (porcentajes 0-100). */
export interface Distribution {
  operacion: number;
  reinversion: number;
  ahorro: number;
}

export interface PlatikData {
  transactions: Transaction[];
  goals: Goal[];
  profile: Profile;
  distribution: Distribution;
  aportesStellar: AporteStellar[];
}
