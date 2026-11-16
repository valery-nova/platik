/**
 * Lectura de cuentas Stellar en Testnet vía Horizon.
 * Solo consultas de solo lectura: nunca firma ni envía transacciones.
 */
import { Horizon } from "@stellar/stellar-sdk";
import {
  HORIZON_TESTNET_URL,
  NETWORK_PASSPHRASE_TESTNET,
  USDC_TESTNET,
} from "./config";
import { AccountNotFoundError, HorizonError, toStellarError } from "./errors";
import type { BalancesInfo } from "./types";

export const horizonServer = new Horizon.Server(HORIZON_TESTNET_URL);

/** Carga la cuenta desde Horizon; lanza AccountNotFoundError si no existe. */
export async function loadAccount(
  address: string,
): Promise<Horizon.AccountResponse> {
  try {
    return await horizonServer.loadAccount(address);
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) throw new AccountNotFoundError(address);
    throw toStellarError(err, "horizon_error");
  }
}

/** Extrae los balances relevantes (XLM nativo + USDC de prueba). */
export function parseBalances(
  account: Horizon.AccountResponse,
): BalancesInfo {
  let xlm = "0";
  let usdc: string | null = null;

  for (const line of account.balances) {
    if (line.asset_type === "native") {
      xlm = line.balance;
      continue;
    }
    if (
      "asset_code" in line &&
      line.asset_code === USDC_TESTNET.code &&
      "asset_issuer" in line &&
      line.asset_issuer === USDC_TESTNET.issuer
    ) {
      usdc = line.balance;
    }
  }

  return {
    xlm,
    usdc,
    tieneTrustlineUsdc: usdc !== null,
  };
}

/** Atajo: carga la cuenta y devuelve sus balances en un solo paso. */
export async function getBalances(address: string): Promise<BalancesInfo> {
  const account = await loadAccount(address);
  return parseBalances(account);
}

/** Comprueba la red de una passphrase de wallet contra la de Testnet. */
export function isTestnetPassphrase(passphrase: string): boolean {
  return passphrase === NETWORK_PASSPHRASE_TESTNET;
}

/** Envuelve errores de red Horizon con contexto. */
export function wrapHorizonError(err: unknown, context: string): HorizonError {
  return new HorizonError(`${context}: ${toStellarError(err).message}`);
}
