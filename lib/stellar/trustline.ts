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
import { parseBalances } from "./account";
import { TrustlineMissingError } from "./errors";

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
