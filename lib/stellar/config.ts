/**
 * Configuración centralizada de Stellar para PLATIK.
 *
 * REGLA: PLATIK opera EXCLUSIVAMENTE en Stellar Testnet.
 * No existe ninguna ruta a Mainnet en este archivo ni en el resto de lib/stellar.
 */

export const STELLAR_NETWORK = "testnet" as const;

/** Horizon público de Stellar Testnet (solo lectura + envío de txs de prueba). */
export const HORIZON_TESTNET_URL = "https://horizon-testnet.stellar.org";

/** Passphrase de red Testnet (red de pruebas de Stellar, septiembre 2015). */
export const NETWORK_PASSPHRASE_TESTNET =
  "Test SDF Network ; September 2015";

/**
 * USDC de prueba emitido por Circle en Stellar Testnet.
 * Verificado en la documentación oficial de Circle:
 * https://developers.circle.com/stablecoins/quickstarts/transfer-usdc-stellar
 */
export const USDC_TESTNET = {
  code: "USDC",
  issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
} as const;

/**
 * Dirección receptora de los aportes de ahorro en Testnet.
 * Se configura con NEXT_PUBLIC_STELLAR_TESTNET_RECIPIENT.
 * Si no está definida, la UI debe mostrar el estado "sin configurar"
 * en lugar de inventar una dirección.
 */
export function getTestnetRecipient(): string | null {
  const addr = process.env.NEXT_PUBLIC_STELLAR_TESTNET_RECIPIENT?.trim();
  return addr && addr.length > 0 ? addr : null;
}

/** Explorer de Testnet para mostrar hashes y cuentas. */
export const EXPLORER_TESTNET_BASE = "https://stellar.expert/explorer/testnet";

export function explorerTxUrl(hash: string): string {
  return `${EXPLORER_TESTNET_BASE}/tx/${hash}`;
}

export function explorerAccountUrl(address: string): string {
  return `${EXPLORER_TESTNET_BASE}/account/${address}`;
}

/** Friendbot: fondea XLM de prueba (fees) en Testnet. Requiere cuenta activada. */
export function friendbotUrl(address: string): string {
  return `https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`;
}

/** Circle Faucet: 20 USDC de prueba por red cada 2 h por dirección. */
export const CIRCLE_FAUCET_URL = "https://faucet.circle.com/";

/** Etiqueta obligatoria en toda la UI al mostrar USDC de prueba. */
export const USDC_TESTNET_LABEL = "USDC de prueba — Stellar Testnet — Sin valor monetario real";
