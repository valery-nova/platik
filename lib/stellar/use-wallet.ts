"use client";

/**
 * Hook de estado de la wallet Stellar (Varial/Freighter) para PLATIK.
 * Gestiona: detección de extensión, conexión, red, balances y errores.
 * No guarda claves ni XDR: solo dirección pública y datos de Horizon.
 */
import { useCallback, useState, useSyncExternalStore } from "react";
import { getBalances } from "./account";
import { StellarError, toStellarError } from "./errors";
import type { BalancesInfo, WalletInfo } from "./types";
import { connectWallet, disconnectWallet, isWalletInstalled } from "./wallet";

export type WalletStatus =
  | "checking"
  | "not_installed"
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface WalletState {
  status: WalletStatus;
  wallet: WalletInfo | null;
  balances: BalancesInfo | null;
  /** Último error de wallet/Horizon (p. ej. cuenta sin activar). */
  error: StellarError | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalances: () => Promise<void>;
}

type ConnectStatus = "idle" | "connecting" | "connected" | "error";

const subscribeNoop = () => () => {};

export function useStellarWallet(): WalletState {
  // La instalación de la extensión no cambia durante la sesión:
  // snapshot estático en cliente, false en servidor (evita mismatch).
  const installed = useSyncExternalStore(
    subscribeNoop,
    isWalletInstalled,
    () => false,
  );
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>("idle");
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [balances, setBalances] = useState<BalancesInfo | null>(null);
  const [error, setError] = useState<StellarError | null>(null);

  const status: WalletStatus = !installed
    ? "not_installed"
    : wallet
      ? "connected"
      : connectStatus === "connecting"
        ? "connecting"
        : connectStatus === "error"
          ? "error"
          : "disconnected";

  const loadBalances = useCallback(async (address: string) => {
    try {
      const b = await getBalances(address);
      setBalances(b);
      setError(null);
    } catch (err) {
      setBalances(null);
      setError(toStellarError(err, "horizon_error"));
    }
  }, []);

  const connect = useCallback(async () => {
    if (!installed) return;
    setConnectStatus("connecting");
    setError(null);
    try {
      const info = await connectWallet();
      setWallet(info);
      setConnectStatus("connected");
      await loadBalances(info.address);
    } catch (err) {
      setError(toStellarError(err));
      setConnectStatus("error");
    }
  }, [installed, loadBalances]);

  const disconnect = useCallback(async () => {
    await disconnectWallet();
    setWallet(null);
    setBalances(null);
    setError(null);
    setConnectStatus("idle");
  }, []);

  const refreshBalances = useCallback(async () => {
    if (wallet) await loadBalances(wallet.address);
  }, [wallet, loadBalances]);

  return { status, wallet, balances, error, connect, disconnect, refreshBalances };
}
