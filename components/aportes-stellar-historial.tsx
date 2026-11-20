"use client";

import { useEffect, useRef, useState } from "react";
import { usePlatik } from "@/lib/store";
import { explorerTxUrl } from "@/lib/stellar/config";
import { ESTADO_APORTE_LABEL, transicionarAporteStellar } from "@/lib/stellar/aporte";
import { getTransactionStatus } from "@/lib/stellar/verify";
import type { AporteStellar, AporteStellarEstado } from "@/lib/stellar/types";
import { uiLocaleTag } from "@/lib/locale";
import { Badge, Button, Card, CardHeader } from "./ui";
import { formatUsdc, shortAddr } from "./usdc-ui";

const TONE: Record<AporteStellarEstado, "neutral" | "menta" | "coral" | "lavanda"> = {
  preparado: "neutral",
  firma_solicitada: "lavanda",
  enviada: "lavanda",
  confirmada: "menta",
  fallida: "coral",
  cancelada: "coral",
};

function fechaHora(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(uiLocaleTag(), { dateStyle: "medium", timeStyle: "short" });
}

export function AportesStellarHistorial() {
  const { data, hydrated, upsertAporteStellar } = usePlatik();
  const aportes = data.aportesStellar;
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const recuperado = useRef(false);

  const reverificar = async (a: AporteStellar) => {
    if (!a.txHash) return;
    setCheckingId(a.id);
    try {
      const s = await getTransactionStatus(a.txHash);
      if (!s.found) return;
      upsertAporteStellar(
        s.successful
          ? transicionarAporteStellar(a, "confirmada", {
              confirmedAt: s.closedAt ?? undefined,
              ledger: s.ledger ?? undefined,
            })
          : transicionarAporteStellar(a, "fallida", {
              ledger: s.ledger ?? undefined,
              error: "Horizon registró la transacción como fallida.",
            })
      );
    } catch {
      // Sin red: se conserva el estado y se puede reintentar.
    } finally {
      setCheckingId(null);
    }
  };

  useEffect(() => {
    if (!hydrated || recuperado.current) return;
    recuperado.current = true;
    for (const a of aportes) {
      if (a.estado === "enviada" && a.txHash) {
        void getTransactionStatus(a.txHash)
          .then((s) => {
            if (!s.found) return;
            upsertAporteStellar(
              s.successful
                ? transicionarAporteStellar(a, "confirmada", {
                    confirmedAt: s.closedAt ?? undefined,
                    ledger: s.ledger ?? undefined,
                  })
                : transicionarAporteStellar(a, "fallida", {
                    ledger: s.ledger ?? undefined,
                    error: "Horizon registró la transacción como fallida.",
                  })
              
            );
          })
          .catch(() => undefined);
      } else if (a.estado === "firma_solicitada" || a.estado === "preparado") {
        upsertAporteStellar(
          transicionarAporteStellar(a, "cancelada", {
            error: "Interrumpido antes de enviarse (la página se recargó o cerró).",
          })
        );
      }
    }
  }, [aportes, upsertAporteStellar, hydrated]);

  if (aportes.length === 0) return null;
  const goalNombre = (id: string) =>
    data.goals.find((g) => g.id === id)?.nombre ?? "Meta eliminada";

  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardHeader
        title="Aportes USDC legacy (Testnet)"
        subtitle="Envíos antiguos a la dirección receptora configurada; se conservan para verificación."
      />
      <ul className="divide-y divide-petroleo/6">
        {aportes.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-tinta">
                {formatUsdc(a.importe)} → {goalNombre(a.goalId)}
              </p>
              <p className="text-xs text-tinta-suave">
                {fechaHora(a.confirmedAt ?? a.createdAt)}
                {a.ledger ? ` · ledger ${a.ledger}` : ""}
              </p>
              {a.txHash && (
                <p className="text-xs">
                  <a className="font-mono text-petroleo underline" href={explorerTxUrl(a.txHash)} target="_blank" rel="noreferrer">
                    {shortAddr(a.txHash, 8)}
                  </a>
                </p>
              )}
              {a.error && <p className="text-xs text-coral-600">{a.error}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={TONE[a.estado]}>{ESTADO_APORTE_LABEL[a.estado]}</Badge>
              {a.estado === "enviada" && (
                <Button variant="outline" onClick={() => void reverificar(a)} disabled={checkingId === a.id}>
                  {checkingId === a.id ? "…" : "Reverificar"}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
