export type TxType = "ingreso" | "gasto" | "costo";

export interface Transaction {
  id: string;
  tipo: TxType;
  /** Monto en la moneda principal (BOB por defecto) */
  monto: number;
  categoria: string;
  descripcion: string;
  /** Fecha ISO (yyyy-mm-dd) */
  fecha: string;
}

export interface Goal {
  id: string;
  nombre: string;
  montoObjetivo: number;
  ahorroAcumulado: number;
  fechaObjetivo?: string;
}

export type Currency = "BOB" | "USD";

export interface Profile {
  nombreNegocio: string;
  nombreUsuario: string;
  moneda: Currency;
}

/** Porcentajes sugeridos (suman 100) para distribuir la ganancia. */
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
}
