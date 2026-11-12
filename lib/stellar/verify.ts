/**
 * Verificación de transacciones enviadas contra Horizon Testnet.
 * Regla de PLATIK: un aporte solo cuenta como confirmado cuando
 * Horizon devuelve la transacción con successful === true.
 */
import { horizonServer } from "./account";
import { toStellarError } from "./errors";

export interface TxStatus {
  found: boolean;
  successful: boolean | null;
  ledger: number | null;
}

/** Consulta el estado de una transacción por hash. */
export async function getTransactionStatus(hash: string): Promise<TxStatus> {
  try {
    const tx = await horizonServer.transactions().transaction(hash).call();
    return {
      found: true,
      successful: tx.successful,
      ledger: tx.ledger_attr,
    };
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      return { found: false, successful: null, ledger: null };
    }
    throw toStellarError(err, "horizon_error");
  }
}

export interface WaitOptions {
  /** Intervalo entre consultas (ms). Por defecto 3 s. */
  intervalMs?: number;
  /** Tiempo máximo de espera (ms). Por defecto 90 s. */
  timeoutMs?: number;
  /** Permite cancelar la espera (p. ej. al desmontar la UI). */
  signal?: AbortSignal;
}

/**
 * Espera a que Horizon confirme (o rechace) una transacción.
 * Devuelve el estado final; lanza si se agota el tiempo o se aborta.
 */
export async function waitForConfirmation(
  hash: string,
  options: WaitOptions = {},
): Promise<TxStatus> {
  const { intervalMs = 3000, timeoutMs = 90_000, signal } = options;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    if (signal?.aborted) {
      throw new Error("Espera de confirmación cancelada.");
    }

    const status = await getTransactionStatus(hash);
    if (status.found) return status;

    if (Date.now() >= deadline) {
      throw new Error(
        "La transacción aún no aparece en Horizon. Revisa el hash en el explorer antes de reintentar.",
      );
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
