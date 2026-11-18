/**
 * Detección y verificación de depósitos USDC entrantes en Stellar Testnet.
 * Solo lee Horizon y confirma por hash; nunca registra un depósito sin
 * verificar la transacción ni confía en importes enviados por el cliente.
 */
import { horizonServer } from "./account";
import { USDC_TESTNET } from "./config";
import type { DepositoUsdc } from "./types";
import { getTransactionStatus } from "./verify";

export interface DepositCandidate {
  txHash: string;
  from: string;
  to: string;
  amount: number;
  createdAt: string;
  ledger: number | null;
  successful: boolean | null;
}

interface HorizonPaymentRecord {
  type?: string;
  transaction_hash?: string;
  from?: string;
  to?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  amount?: string;
  created_at?: string;
  ledger_attr?: number;
  transaction_successful?: boolean;
}

function isIncomingUsdc(record: HorizonPaymentRecord, address: string): boolean {
  if (record.type && record.type !== "payment") return false;
  if (record.to !== address) return false;
  if (record.asset_code !== USDC_TESTNET.code) return false;
  if (record.asset_issuer !== USDC_TESTNET.issuer) return false;
  const amount = Number(record.amount ?? 0);
  return Number.isFinite(amount) && amount > 0;
}

/** Pagos USDC de prueba recibidos por `address`, más recientes primero. */
export async function fetchIncomingUsdcPayments(
  address: string,
): Promise<DepositCandidate[]> {
  const res = (await horizonServer
    .payments()
    .forAccount(address)
    .order("desc")
    .limit(50)
    .call()) as { records?: HorizonPaymentRecord[] };

  return (res.records ?? [])
    .filter((r) => isIncomingUsdc(r, address))
    .map((r) => ({
      txHash: r.transaction_hash ?? "",
      from: r.from ?? "",
      to: r.to ?? address,
      amount: Number(r.amount ?? 0),
      createdAt: r.created_at ?? new Date().toISOString(),
      ledger: typeof r.ledger_attr === "number" ? r.ledger_attr : null,
      successful: typeof r.transaction_successful === "boolean" ? r.transaction_successful : null,
    }))
    .filter((c) => c.txHash.length > 0);
}

function baseDeposito(
  candidate: DepositCandidate,
  walletAddress: string,
  existing: DepositoUsdc | undefined,
  defaultGoalId: string | undefined,
): DepositoUsdc {
  return {
    id: existing?.id ?? `usdc-${candidate.txHash}`,
    goalId: existing?.goalId ?? defaultGoalId,
    walletAddress,
    originAddress: candidate.from || existing?.originAddress,
    destinationAddress: walletAddress,
    assetCode: USDC_TESTNET.code,
    assetIssuer: USDC_TESTNET.issuer,
    red: "testnet",
    importe: candidate.amount,
    estado: "pendiente",
    txHash: candidate.txHash,
    ledger: candidate.ledger ?? existing?.ledger,
    createdAt: existing?.createdAt ?? candidate.createdAt,
  };
}

/**
 * Sincroniza depósitos entrantes de una wallet con Horizon.
 * Deduplica por txHash, conserva la meta asignada y solo marca
 * "confirmado" cuando Horizon devuelve la transacción como exitosa.
 */
export async function syncDepositsUsdc(
  address: string,
  existing: DepositoUsdc[],
  defaultGoalId?: string,
): Promise<DepositoUsdc[]> {
  const candidates = await fetchIncomingUsdcPayments(address);
  const byHash = new Map(existing.map((d) => [d.txHash, d]));
  const out = [...existing];

  for (const candidate of candidates) {
    const prev = byHash.get(candidate.txHash);
    if (prev?.estado === "confirmado") continue;

    const base = baseDeposito(candidate, address, prev, defaultGoalId);
    const status = await getTransactionStatus(candidate.txHash);

    let next: DepositoUsdc;
    if (!status.found) {
      next = { ...base, estado: "pendiente" };
    } else if (status.successful === false) {
      next = {
        ...base,
        estado: "fallido",
        ledger: status.ledger ?? base.ledger,
        error: "Horizon registró la transacción como fallida.",
      };
    } else if (status.successful === true) {
      next = {
        ...base,
        estado: "confirmado",
        ledger: status.ledger ?? base.ledger,
        confirmedAt: status.closedAt ?? new Date().toISOString(),
      };
      delete next.error;
    } else {
      next = { ...base, estado: "pendiente", ledger: status.ledger ?? base.ledger };
    }

    const idx = out.findIndex((d) => d.txHash === candidate.txHash);
    if (idx >= 0) out[idx] = next;
    else {
      out.push(next);
      byHash.set(candidate.txHash, next);
    }
  }

  return out;
}

/** Suma USDC confirmado asignado a una meta (clasificación contable). */
export function usdcConfirmadoPorMeta(
  depositos: DepositoUsdc[],
  goalId: string,
): number {
  return depositos
    .filter((d) => d.goalId === goalId && d.estado === "confirmado")
    .reduce((sum, d) => sum + d.importe, 0);
}
