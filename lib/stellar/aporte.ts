/**
 * Registro y transiciones de estado de aportes on-chain.
 * Funciones puras: la UI decide cuándo persistir vía el store.
 * Nunca incluye XDR firmado, claves privadas ni frases semilla.
 */
import { getTestnetRecipient, USDC_TESTNET } from "./config";
import { RecipientNotConfiguredError } from "./errors";
import type { AporteStellar, AporteStellarEstado } from "./types";

export interface NuevoAporteParams {
  id: string;
  goalId: string;
  walletOrigen: string;
  /** Importe en USDC de prueba (número decimal, p. ej. 5.5). */
  importe: number;
}

/**
 * Crea el registro inicial de un aporte en estado "preparado".
 * Lanza RecipientNotConfiguredError si falta NEXT_PUBLIC_STELLAR_TESTNET_RECIPIENT.
 */
export function crearAporteStellar(params: NuevoAporteParams): AporteStellar {
  const recipient = getTestnetRecipient();
  if (!recipient) throw new RecipientNotConfiguredError();
  if (!(params.importe > 0)) throw new Error("El importe debe ser mayor que cero.");
  return {
    id: params.id,
    goalId: params.goalId,
    walletOrigen: params.walletOrigen,
    direccionReceptora: recipient,
    assetCode: USDC_TESTNET.code,
    assetIssuer: USDC_TESTNET.issuer,
    red: "testnet",
    importe: params.importe,
    estado: "preparado",
    createdAt: new Date().toISOString(),
  };
}

/**
 * Transición de estado de un aporte, con campos extra opcionales
 * (txHash, confirmedAt, error). Devuelve un nuevo objeto (inmutable).
 */
export function transicionarAporteStellar(
  aporte: AporteStellar,
  estado: AporteStellarEstado,
  extra?: Partial<Pick<AporteStellar, "txHash" | "confirmedAt" | "error">>,
): AporteStellar {
  return { ...aporte, estado, ...extra };
}

/** Etiquetas legibles de cada estado para la UI. */
export const ESTADO_APORTE_LABEL: Record<AporteStellarEstado, string> = {
  preparado: "Preparado",
  firma_solicitada: "Firma solicitada",
  enviada: "Enviada",
  confirmada: "Confirmada",
  fallida: "Fallida",
  cancelada: "Cancelada",
};
