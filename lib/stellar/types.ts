/**
 * Tipos del dominio Stellar de PLATIK.
 * Separados de lib/types.ts (datos financieros) a propósito:
 * la lógica Stellar no se mezcla con los cálculos financieros.
 */

/** Estados de un aporte on-chain registrado en PLATIK. */
export type AporteStellarEstado =
  | "preparado"
  | "firma_solicitada"
  | "enviada"
  | "confirmada"
  | "fallida"
  | "cancelada";

/**
 * Registro de un aporte de ahorro en USDC sobre Stellar Testnet.
 * Nunca almacena XDR firmado, claves privadas ni frases semilla.
 */
export interface AporteStellar {
  id: string;
  /** Meta de ahorro (Goal.id) a la que apunta el aporte. */
  goalId: string;
  /** Dirección pública de la wallet origen que firma. */
  walletOrigen: string;
  /** Dirección receptora configurada (NEXT_PUBLIC_STELLAR_TESTNET_RECIPIENT). */
  direccionReceptora: string;
  /** Código del activo (siempre "USDC" en Testnet). */
  assetCode: string;
  /** Issuer del activo (Circle Testnet). */
  assetIssuer: string;
  /** Red Stellar (siempre "testnet"). */
  red: "testnet";
  /** Importe en USDC de prueba (número decimal, p. ej. 5.5). */
  importe: number;
  estado: AporteStellarEstado;
  /** Hash de la transacción en Horizon una vez enviada. */
  txHash?: string;
  /** ISO 8601 — creación del registro. */
  createdAt: string;
  /** ISO 8601 — confirmación en Horizon (solo si estado === "confirmada"). */
  confirmedAt?: string;
  /** Ledger donde Horizon registró la transacción. */
  ledger?: number;
  /** Mensaje de error legible si estado === "fallida". */
  error?: string;
}

/** Estado de la wallet conectada en la UI. */
export interface WalletInfo {
  address: string;
  /** "testnet" | "futurenet" | "public" (passphrase de red de la wallet). */
  network: string;
  networkPassphrase: string;
  connected: boolean;
}

/** Balances relevantes de una cuenta Stellar en Testnet. */
export interface BalancesInfo {
  /** Balance XLM nativo (string de Horizon, p. ej. "12.3456789"). */
  xlm: string;
  /** Balance USDC de prueba o null si no hay trustline. */
  usdc: string | null;
  /** true si la cuenta tiene trustline al USDC de Circle Testnet. */
  tieneTrustlineUsdc: boolean;
}
