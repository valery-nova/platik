"use client";

/**
 * Hook de estado de la wallet Stellar (Varial/Freighter) para PLATIK.
 * Gestiona: detección de extensión, conexión, red, balances y errores.
 * No guarda claves ni XDR: solo dirección pública y datos de Horizon.
 */
import { useCallback, useEffect, useRef, useState } from "react";
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

export function useStellarWallet(): WalletState {
  const [status, setStatus] = useState<WalletStatus>("checking");
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [balances, setBalances] = useState<BalancesInfo | null>(null);
  const [error, setError] = useState<StellarError | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!isWalletInstalled()) {
      setStatus("not_installed");
      return () => {
        mounted.current = false;
      };
    }
    setStatus("disconnected");
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadBalances = useCallback(async (address: string) => {
    try {
      const b = await getBalances(address);
      if (mounted.current) {
        setBalances(b);
        setError(null);
      }
    } catch (err) {
      if (mounted.current) {
        setBalances(null);
        setError(toStellarError(err, "horizon_error"));
      }
    }
  }, []);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    try {
      const info = await connectWallet();
      if (!mounted.current) return;
      setWallet(info);
      setStatus("connected");
      await loadBalances(info.address);
    } catch (err) {
      if (!mounted.current) return;
      setError(toStellarError(err));
      setStatus("error");
    }
  }, [loadBalances]);

  const disconnect = useCallback(async () => {
    await disconnectWallet();
    if (!mounted.current) return;
    setWallet(null);
    setBalances(null);
    setError(null);
    setStatus(isWalletInstalled() ? "disconnected" : "not_installed");
  }, []);

  const refreshBalances = useCallback(async () => {
    if (wallet) await loadBalances(wallet.address);
  }, [wallet, loadBalances]);

  return { status, wallet, balances, error, connect, disconnect, refreshBalances };
}
