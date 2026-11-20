"use client";

/**
 * Balance Horizon (XLM + USDC Testnet) para cualquier dirección Stellar,
 * incluida una wallet integrada de Pollar. Solo lectura.
 */
import { useCallback, useEffect, useState } from "react";
import { getBalances } from "./account";
import { toStellarError } from "./errors";
import type { BalancesInfo } from "./types";

export function useAddressBalances(address: string | null | undefined) {
  const [balances, setBalances] = useState<BalancesInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) {
      setBalances(null);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      setBalances(await getBalances(address));
      setError(null);
    } catch (err) {
      setBalances(null);
      setError(toStellarError(err, "horizon_error").message);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return { balances, loading, error, refresh };
}
