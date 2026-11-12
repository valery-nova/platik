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

/** true en navegador (la wallet no existe en el servidor). */
export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Detecta la extensión Varial/Freighter. Asíncrono: el SDK pregunta a la
 * extensión por postMessage y responde false tras ~2 s si no está instalada.
 * En la API de Freighter, isConnected significa "extensión instalada".
 */
export async function detectWallet(): Promise<boolean> {
  if (!isBrowser()) return false;
  try {
    const res = await sdkIsConnected();
    return !res.error && res.isConnected === true;
  } catch {
    return false;
  }
}

function isRejection(error: { code: number; message: string }): boolean {
  return /reject|declin|denied|cancel/i.test(error.message ?? "");
}

function unwrap<T extends { error?: { code: number; message: string } }>(
  result: T,
): T {
  if (result.error) {
    if (isRejection(result.error)) throw new WalletRejectedError();
    throw new StellarError("unknown", result.error.message);
  }
  return result;
}

async function readWalletInfo(): Promise<WalletInfo> {
  const { address } = unwrap(await sdkGetAddress());
  if (!address) throw new WalletNotConnectedError();
  const { network, networkPassphrase } = unwrap(await sdkGetNetwork());
  if (networkPassphrase !== NETWORK_PASSPHRASE_TESTNET) {
    throw new WrongNetworkError(network || networkPassphrase);
  }
  return { address, network, networkPassphrase, connected: true };
}

/** Conecta la wallet: pide acceso (popup) si hace falta y devuelve dirección + red. */
export async function connectWallet(): Promise<WalletInfo> {
  if (!(await detectWallet())) throw new WalletNotInstalledError();
  try {
    // requestAccess abre el popup si el sitio aún no está autorizado.
    unwrap(await sdkRequestAccess());
    return await readWalletInfo();
  } catch (err) {
    throw toStellarError(err);
  }
}

/**
 * Reconexión silenciosa (sin popup) al recargar la página:
 * solo devuelve datos si el usuario ya autorizó este sitio.
 */
export async function restoreWallet(): Promise<WalletInfo | null> {
  if (!(await detectWallet())) return null;
  try {
    const allowed = unwrap(await sdkIsAllowed());
    if (!allowed.isAllowed) return null;
    return await readWalletInfo();
  } catch (err) {
    const e = toStellarError(err);
    // Red equivocada sí se informa; el resto se trata como "no conectada".
    if (e.code === "wrong_network") throw e;
    return null;
  }
}

/** Desconecta la wallet (revoca el acceso de la app). */
export async function disconnectWallet(): Promise<void> {
  if (!isBrowser()) return;
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
  if (!isBrowser()) throw new WalletNotInstalledError();
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
