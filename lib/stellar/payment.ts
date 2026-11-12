/**
 * Preparación y envío de pagos USDC de prueba en Stellar Testnet.
 * Flujo: construir → firmar con la wallet → enviar a Horizon → verificar.
 * PLATIK nunca custodia fondos ni guarda XDR firmado.
 */
import {
  BASE_FEE,
  Horizon,
  Memo,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  getTestnetRecipient,
  NETWORK_PASSPHRASE_TESTNET,
} from "./config";
import { horizonServer, loadAccount, parseBalances } from "./account";
import {
  InsufficientBalanceError,
  InvalidAmountError,
  RecipientNotConfiguredError,
  TransactionFailedError,
  TrustlineMissingError,
} from "./errors";
import { usdcTestnetAsset } from "./trustline";
import { signTransactionXdr } from "./wallet";
import { waitForConfirmation } from "./verify";

/** Decimales de USDC en Stellar. */
const USDC_DECIMALS = 7;

/**
 * Convierte un importe introducido por el usuario ("5", "5.5", "0.0000001")
 * al formato de cantidad de Stellar (string con hasta 7 decimales).
 * Lanza InvalidAmountError si no es válido.
 */
export function parseUsdcAmount(input: string): string {
  const trimmed = input.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,7})?$/.test(trimmed)) throw new InvalidAmountError();
  const [intPart, decPart = ""] = trimmed.split(".");
  const int = intPart.replace(/^0+(?=\d)/, "") || "0";
  if (int === "0" && Number(decPart || 0) === 0) throw new InvalidAmountError();
  const dec = decPart.padEnd(USDC_DECIMALS, "0");
  return `${int}${dec}`;
}

/** Formatea una cantidad Stellar (7 decimales) a USDC legible. */
export function formatUsdcAmount(stellarAmount: string): string {
  const padded = stellarAmount.padStart(USDC_DECIMALS + 1, "0");
  const int = padded.slice(0, -USDC_DECIMALS);
  const dec = padded.slice(-USDC_DECIMALS).replace(/0+$/, "");
  return dec ? `${int}.${dec}` : int;
}

/** Construye (sin firmar) la transacción de pago USDC hacia el receptor. */
export function buildPaymentXdr(
  sourceAccount: Horizon.AccountResponse,
  destination: string,
  amount: string,
  memoText?: string,
): string {
  const builder = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE_TESTNET,
  }).addOperation(
    Operation.payment({
      destination,
      asset: usdcTestnetAsset(),
      amount,
    }),
  );
  if (memoText) builder.addMemo(Memo.text(memoText.slice(0, 28)));
  return builder.setTimeout(60).build().toXDR();
}

export interface SendPaymentResult {
  txHash: string;
  ledger: number | null;
  successful: boolean | null;
}

export interface SignAndSubmitResult {
  txHash: string;
}

/**
 * Firma y envía el pago a Horizon sin esperar confirmación.
 * Devuelve el hash en cuanto Horizon acepta la transacción;
 * la confirmación se verifica aparte con waitForConfirmation.
 * El XDR firmado solo vive en memoria durante esta llamada.
 */
export async function signAndSubmitUsdcPayment(params: {
  sourceAddress: string;
  amountInput: string;
  memoText?: string;
}): Promise<SignAndSubmitResult> {
  const recipient = getTestnetRecipient();
  if (!recipient) throw new RecipientNotConfiguredError();

  const amount = parseUsdcAmount(params.amountInput);

  const sourceAccount = await loadAccount(params.sourceAddress);
  const balances = parseBalances(sourceAccount);
  if (!balances.tieneTrustlineUsdc) {
    throw new TrustlineMissingError();
  }
  if (balances.usdc === null) {
    throw new InsufficientBalanceError();
  }
  // balances.usdc viene en unidades USDC (p. ej. "12.5"); amount en stroops.
  const usdcUnits = Number(amount) / 10 ** USDC_DECIMALS;
  if (Number(balances.usdc) < usdcUnits) {
    throw new InsufficientBalanceError();
  }

  const unsignedXdr = buildPaymentXdr(
    sourceAccount,
    recipient,
    amount,
    params.memoText,
  );
  const signedXdr = await signTransactionXdr(unsignedXdr, params.sourceAddress);

  // Horizon v17 exige un objeto Transaction, no el XDR en crudo.
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

  return { txHash: submit.hash };
}

/**
 * Flujo completo de un aporte: firma, envía y espera confirmación.
 * La UI usa signAndSubmitUsdcPayment + waitForConfirmation por separado
 * para poder registrar los estados intermedios del aporte.
 */
export async function sendUsdcPayment(params: {
  sourceAddress: string;
  amountInput: string;
  memoText?: string;
}): Promise<SendPaymentResult> {
  const { txHash } = await signAndSubmitUsdcPayment(params);
  const status = await waitForConfirmation(txHash);
  if (status.successful === false) {
    throw new TransactionFailedError(
      `La transacción ${txHash} falló en el ledger ${status.ledger}.`,
    );
  }

  return {
    txHash,
    ledger: status.ledger,
    successful: status.successful,
  };
}

/** Reexporta el asset para la UI. */
export { usdcTestnetAsset };
