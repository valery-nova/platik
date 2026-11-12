/**
 * Construcción y envío de operaciones changeTrust para USDC de prueba.
 * El usuario firma siempre desde su wallet; PLATIK solo prepara el XDR.
 */
import {
  Asset,
  BASE_FEE,
  Horizon,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  NETWORK_PASSPHRASE_TESTNET,
  USDC_TESTNET,
} from "./config";
import { horizonServer, loadAccount, parseBalances } from "./account";
import { TrustlineMissingError, TransactionFailedError } from "./errors";
import { signTransactionXdr } from "./wallet";
import { waitForConfirmation } from "./verify";

/** Activo USDC de prueba de Circle en Testnet. */
export function usdcTestnetAsset(): Asset {
  return new Asset(USDC_TESTNET.code, USDC_TESTNET.issuer);
}

/** true si la cuenta ya confía en el USDC de prueba. */
export function hasUsdcTrustline(account: Horizon.AccountResponse): boolean {
  return parseBalances(account).tieneTrustlineUsdc;
}

/** Límite por defecto de la trustline (7 decimales de USDC). */
const TRUSTLINE_LIMIT = "1000000";

/**
 * Construye (sin firmar) la transacción changeTrust para USDC de prueba.
 * Devuelve el XDR listo para firmar con la wallet.
 */
export function buildChangeTrustXdr(
  sourceAccount: Horizon.AccountResponse,
  limit = TRUSTLINE_LIMIT,
): string {
  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE_TESTNET,
  })
    .addOperation(
      Operation.changeTrust({
        asset: usdcTestnetAsset(),
        limit,
      }),
    )
    .setTimeout(30)
    .build();
  return tx.toXDR();
}

/** Valida que la cuenta tenga trustline; lanza TrustlineMissingError si no. */
export function assertUsdcTrustline(account: Horizon.AccountResponse): void {
  if (!hasUsdcTrustline(account)) throw new TrustlineMissingError();
}

export interface TrustlineResult {
  txHash: string;
  ledger: number | null;
  /** true si la trustline ya existía y no hizo falta transacción. */
  yaExistia: boolean;
}

/**
 * Garantiza que la cuenta del usuario confía en el USDC de prueba.
 * Si falta, construye el changeTrust, lo firma con la wallet,
 * lo envía a Horizon y espera confirmación.
 */
export async function ensureUsdcTrustline(
  sourceAddress: string,
): Promise<TrustlineResult> {
  const account = await loadAccount(sourceAddress);
  if (hasUsdcTrustline(account)) {
    return { txHash: "", ledger: null, yaExistia: true };
  }

  const unsignedXdr = buildChangeTrustXdr(account);
  const signedXdr = await signTransactionXdr(unsignedXdr, sourceAddress);
  const signedTx = TransactionBuilder.fromXDR(
    signedXdr,
    NETWORK_PASSPHRASE_TESTNET,
  );

  let submit;
  try {
    submit = await horizonServer.submitTransaction(signedTx);
  } catch (err) {
    throw new TransactionFailedError(
      err instanceof Error ? err.message : "Horizon rechazó la transacción.",
    );
  }

  const status = await waitForConfirmation(submit.hash);
  if (status.successful === false) {
    throw new TransactionFailedError(
      `La transacción ${submit.hash} falló en el ledger ${status.ledger}.`,
    );
  }

  // Verificación final: la trustline debe aparecer en Horizon.
  const after = await loadAccount(sourceAddress);
  if (!hasUsdcTrustline(after)) {
    throw new TransactionFailedError(
      "La transacción se confirmó pero la trustline no aparece en Horizon.",
    );
  }

  return { txHash: submit.hash, ledger: status.ledger, yaExistia: false };
}
