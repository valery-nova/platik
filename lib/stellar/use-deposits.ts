"use client";

/**
 * Sincroniza depósitos USDC entrantes de una wallet con Horizon y los
 * guarda en el store de PLATIK. Deduplica por operación Horizon.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePlatik } from "@/lib/store";
import type { DepositoUsdc } from "./types";
import { syncDepositsUsdc } from "./deposits";

export function useUsdcDeposits(address: string | null | undefined) {
  const { data, upsertDepositoUsdc } = usePlatik();
  const depositsRef = useRef(data.depositosUsdc);
  const upsertRef = useRef(upsertDepositoUsdc);

  const deposits = useMemo(
    () =>
      address
        ? data.depositosUsdc.filter((d) => d.walletAddress === address)
        : [],
    [data.depositosUsdc, address],
  );

  const sync = useCallback(
    async (defaultGoalId?: string): Promise<DepositoUsdc[]> => {
      if (!address) return [];
      const current = depositsRef.current.filter((d) => d.walletAddress === address);
      const synced = await syncDepositsUsdc(address, current, defaultGoalId);
      for (const d of synced) upsertRef.current(d);
      return synced;
    },
    [address],
  );

  useEffect(() => {
    depositsRef.current = data.depositosUsdc;
    upsertRef.current = upsertDepositoUsdc;
  }, [data.depositosUsdc, upsertDepositoUsdc]);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void sync().catch(() => undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [address, sync]);

  return { deposits, sync };
}
