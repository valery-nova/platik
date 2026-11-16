"use client";

/**
 * Hook de estado de la wallet Stellar (Varial/Freighter) para PLATIK.
 * Gestiona: detección de extensión, conexión, red, balances y errores.
 * No guarda claves ni XDR: solo dirección pública y datos de Horizon.
 */
import { useCallback, useEffect, useState } from "react";
import { getBalances } from "./account";
import { StellarError, toStellarError } from "./errors";
import type { BalancesInfo, WalletInfo } from "./types";
import {
  connectWallet,
  detectWallet,
  disconnectWallet,
  restoreWallet,
} from "./wallet";

export type WalletStatus =
  | "checking"
  | "not_installed"
  | "disconnected"
  | "connecting"
  | "connected"
  | "wrong_network"
  | "error";

export interface WalletState {
  status: WalletStatus;
  wallet: WalletInfo | null;
  balances: BalancesInfo | null;
  balancesLoading: boolean;
  /** Error de conexión de wallet (rechazo, red, etc.). */
  error: StellarError | null;
  /** Error al leer la cuenta en Horizon (p. ej. cuenta sin activar). */
  accountError: StellarError | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  /** Vuelve a comprobar si la extensión está instalada. */
  recheck: () => Promise<void>;
}

export function useStellarWallet(): WalletState {
  const [status, setStatus] = useState<WalletStatus>("checking");
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [balances, setBalances] = useState<BalancesInfo | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [error, setError] = useState<StellarError | null>(null);
  const [accountError, setAccountError] = useState<StellarError | null>(null);

  const loadBalances = useCallback(async (address: string) => {
    setBalancesLoading(true);
    try {
      const b = await getBalances(address);
      setBalances(b);
      setAccountError(null);
    } catch (err) {
      setBalances(null);
      setAccountError(toStellarError(err, "horizon_error"));
    } finally {
      setBalancesLoading(false);
    }
  }, []);

  const applyWallet = useCallback(
    async (info: WalletInfo) => {
      setWallet(info);
      setError(null);
      setStatus("connected");
      await loadBalances(info.address);
    },
    [loadBalances],
  );

  const handleError = useCallback((err: unknown) => {
    const e = toStellarError(err);
    setWallet(null);
    setBalances(null);
    setError(e);
    setStatus(
      e.code === "wrong_network"
        ? "wrong_network"
        : e.code === "wallet_not_installed"
          ? "not_installed"
          : "error",
    );
  }, []);

  const init = useCallback(async () => {
    const installed = await detectWallet();
    if (!installed) {
      setStatus("not_installed");
      return;
    }
    try {
      const info = await restoreWallet();
      if (info) await applyWallet(info);
      else setStatus("disconnected");
    } catch (err) {
      handleError(err);
    }
  }, [applyWallet, handleError]);

  useEffect(() => {
    let cancelled = false;
    // Promise.resolve() difiere la ejecución: no hay setState síncrono en el efecto.
    void Promise.resolve().then(() => {
      if (!cancelled) void init();
    });
    return () => {
      cancelled = true;
    };
  }, [init]);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    try {
      await applyWallet(await connectWallet());
    } catch (err) {
      handleError(err);
    }
  }, [applyWallet, handleError]);

  const disconnect = useCallback(async () => {
    await disconnectWallet();
    setWallet(null);
    setBalances(null);
    setError(null);
    setAccountError(null);
    setStatus("disconnected");
  }, []);

  const refreshBalances = useCallback(async () => {
    if (wallet) await loadBalances(wallet.address);
  }, [wallet, loadBalances]);

  const recheck = useCallback(async () => {
    setStatus("checking");
    setError(null);
    await init();
  }, [init]);

  return {
    status,
    wallet,
    balances,
    balancesLoading,
    error,
    accountError,
    connect,
    disconnect,
    refreshBalances,
    recheck,
  };
}
