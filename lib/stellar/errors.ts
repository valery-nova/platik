/**
 * Errores del dominio Stellar de PLATIK.
 * Cada error lleva un código estable para que la UI traduzca
 * a mensajes en español sin acoplarse a textos del SDK.
 */

export type StellarErrorCode =
  | "wallet_not_installed"
  | "wallet_not_connected"
  | "wallet_rejected"
  | "wrong_network"
  | "account_not_found"
  | "trustline_missing"
  | "insufficient_balance"
  | "recipient_not_configured"
  | "invalid_amount"
  | "horizon_error"
  | "transaction_failed"
  | "unknown";

export class StellarError extends Error {
  readonly code: StellarErrorCode;

  constructor(code: StellarErrorCode, message: string) {
    super(message);
    this.name = "StellarError";
    this.code = code;
  }
}

export class WalletNotInstalledError extends StellarError {
  constructor() {
    super(
      "wallet_not_installed",
      "No se detectó ninguna wallet Stellar (Varial/Freighter). Instala la extensión para continuar.",
    );
    this.name = "WalletNotInstalledError";
  }
}

export class WalletNotConnectedError extends StellarError {
  constructor() {
    super(
      "wallet_not_connected",
      "La wallet no está conectada. Conéctala para continuar.",
    );
    this.name = "WalletNotConnectedError";
  }
}

export class WalletRejectedError extends StellarError {
  constructor() {
    super("wallet_rejected", "Rechazaste la solicitud en la wallet.");
    this.name = "WalletRejectedError";
  }
}

export class WrongNetworkError extends StellarError {
  constructor(network: string) {
    super(
      "wrong_network",
      `La wallet está en la red "${network}". PLATIK solo opera en Stellar Testnet. Cambia la red en tu wallet.`,
    );
    this.name = "WrongNetworkError";
  }
}

export class AccountNotFoundError extends StellarError {
  constructor(address: string) {
    super(
      "account_not_found",
      `La cuenta ${address} no existe en Testnet. Actívala con XLM de prueba desde Friendbot.`,
    );
    this.name = "AccountNotFoundError";
  }
}

export class TrustlineMissingError extends StellarError {
  constructor() {
    super(
      "trustline_missing",
      "Tu cuenta no tiene trustline para USDC de prueba. Créalas una vez firmando la operación en tu wallet.",
    );
    this.name = "TrustlineMissingError";
  }
}

export class InsufficientBalanceError extends StellarError {
  constructor() {
    super(
      "insufficient_balance",
      "Saldo USDC de prueba insuficiente para este aporte.",
    );
    this.name = "InsufficientBalanceError";
  }
}

export class RecipientNotConfiguredError extends StellarError {
  constructor() {
    super(
      "recipient_not_configured",
      "Falta configurar la dirección receptora de Testnet (NEXT_PUBLIC_STELLAR_TESTNET_RECIPIENT).",
    );
    this.name = "RecipientNotConfiguredError";
  }
}

export class InvalidAmountError extends StellarError {
  constructor() {
    super("invalid_amount", "El importe debe ser un número positivo de USDC de prueba.");
    this.name = "InvalidAmountError";
  }
}

export class HorizonError extends StellarError {
  constructor(message: string) {
    super("horizon_error", message);
    this.name = "HorizonError";
  }
}

export class TransactionFailedError extends StellarError {
  constructor(message: string) {
    super("transaction_failed", message);
    this.name = "TransactionFailedError";
  }
}

/** Normaliza errores desconocidos (SDK, red, etc.) a StellarError. */
export function toStellarError(err: unknown, fallbackCode: StellarErrorCode = "unknown"): StellarError {
  if (err instanceof StellarError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  return new StellarError(fallbackCode, msg || "Error inesperado de Stellar.");
}
