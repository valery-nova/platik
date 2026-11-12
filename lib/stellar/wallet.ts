/**
 * Integración con la wallet Varial (antes Freighter) vía @stellar/varial-sdk.
 * La wallet solo firma: PLATIK nunca ve ni almacena claves privadas.
 */
import {
  disconnect as sdkDisconnect,
  getAddress as sdkGetAddress,
  getNetwork as sdkGetNetwork,
  isAllowed as sdkIsAllowed,
  isConnected as sdkIsConnected,
  requestAccess as sdkRequestAccess,
  setAllowed as sdkSetAllowed,
  signTransaction as sdkSignTransaction,
} from "@stellar/varial-sdk";
import { NETWORK_PASSPHRASE_TESTNET } from "./config";
import {
  StellarError,
  WalletNotConnectedError,
  WalletNotInstalledError,
  WalletRejectedError,
  WrongNetworkError,
  toStellarError,
} from "./errors";
import type { WalletInfo } from "./types";

/** La wallet solo existe en el navegador. */
export function isBrowser(): boolean {
  return typeof window !== "undefined" && "freighter" in window;
}

/** true si la extensión Varial/Freighter está instalada. */
export function isWalletInstalled(): boolean {
  return isBrowser();
}

function unwrap<T extends { error?: { code: number; message: string } }>(
  result: T,
): T {
  if (result.error) {
    // code 14 = USER_REJECTED en la API de Freighter/Varial
    if (result.error.code === 14) throw new WalletRejectedError();
    throw new StellarError("unknown", result.error.message);
  }
  return result;
}

/** Conecta la wallet: pide acceso si hace falta y devuelve dirección + red. */
export async function connectWallet(): Promise<WalletInfo> {
  if (!isWalletInstalled()) throw new WalletNotInstalledError();

  try {
    const connected = unwrap(await sdkIsConnected());
    if (!connected.isConnected) {
      unwrap(await sdkRequestAccess());
    } else {
      const allowed = unwrap(await sdkIsAllowed());
      if (!allowed.isAllowed) {
        unwrap(await sdkSetAllowed());
      }
    }

    const { address } = unwrap(await sdkGetAddress());
    const { network, networkPassphrase } = unwrap(await sdkGetNetwork());

    if (networkPassphrase !== NETWORK_PASSPHRASE_TESTNET) {
      throw new WrongNetworkError(network || networkPassphrase);
    }

    return { address, network, networkPassphrase, connected: true };
  } catch (err) {
    throw toStellarError(err);
  }
}

/** Desconecta la wallet (revoca el acceso de la app). */
export async function disconnectWallet(): Promise<void> {
  if (!isWalletInstalled()) return;
  try {
    unwrap(await sdkDisconnect());
  } catch {
    // Desconectar es best-effort: si falla, la UI igual limpia su estado.
  }
}

/** Firma un XDR de transacción con la wallet; devuelve el XDR firmado. */
export async function signTransactionXdr(
  transactionXdr: string,
  address: string,
): Promise<string> {
  if (!isWalletInstalled()) throw new WalletNotInstalledError();
  try {
    const { signedTxXdr } = unwrap(
      await sdkSignTransaction(transactionXdr, {
        networkPassphrase: NETWORK_PASSPHRASE_TESTNET,
        address,
      }),
    );
    if (!signedTxXdr) throw new WalletNotConnectedError();
    return signedTxXdr;
  } catch (err) {
    throw toStellarError(err);
  }
}
