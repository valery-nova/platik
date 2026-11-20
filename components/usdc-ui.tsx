"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { DepositoUsdc, Goal } from "@/lib/types";
import { uiLocaleTag } from "@/lib/locale";
import {
  explorerAccountUrl,
  explorerTxUrl,
  USDC_TESTNET_LABEL,
} from "@/lib/stellar/config";
import { Badge, Button, Field, Input, Modal, Select } from "./ui";

export function formatUsdc(n: number): string {
  const s = n.toFixed(7);
  const trimmed = s.replace(/0+$/, "").replace(/\.$/, "");
  return trimmed === "" ? "0" : trimmed;
}

export function shortAddr(address: string, size = 6): string {
  if (address.length <= size * 2 + 3) return address;
  return `${address.slice(0, size)}…${address.slice(-size)}`;
}

const linkClass =
  "text-petroleo underline decoration-menta-500 underline-offset-2 hover:text-menta-700";

export function UsdcReceiveModal({
  open,
  onClose,
  address,
  goals,
  goalId,
  onGoalChange,
  amount,
  onAmountChange,
}: {
  open: boolean;
  onClose: () => void;
  address: string;
  goals: Goal[];
  goalId: string;
  onGoalChange: (goalId: string) => void;
  amount: string;
  onAmountChange: (amount: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Recibir USDC">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-2xl border border-petroleo/10 bg-white p-3">
          <QRCodeSVG value={address} size={180} level="M" />
        </div>
        <div className="w-full rounded-xl bg-petroleo-50 px-3 py-2 font-mono text-xs break-all text-petroleo">
          {address}
        </div>
        <Button variant="outline" onClick={() => void copy()}>
          {copied ? "Dirección copiada" : "Copiar dirección"}
        </Button>
        <dl className="w-full space-y-2 text-left text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-tinta-suave">Red</dt>
            <dd className="font-medium text-petroleo">Stellar Testnet</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-tinta-suave">Activo esperado</dt>
            <dd className="font-medium text-petroleo">USDC de prueba (Circle)</dd>
          </div>
          <Field label="Meta de ahorro (opcional)">
            <Select value={goalId} onChange={(e) => onGoalChange(e.target.value)}>
              <option value="">Sin clasificar todavía</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Importe esperado (opcional)" hint="Algunos wallets pueden incluirlo en el QR; PLATIK siempre verificará el importe real en Horizon.">
            <Input
              inputMode="decimal"
              placeholder="Ej. 25.5"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
            />
          </Field>
        </dl>
        <p className="text-xs text-tinta-suave">{USDC_TESTNET_LABEL}</p>
        <p className="text-xs text-tinta-suave">
          Escanea el QR desde otra wallet o envía a la dirección. PLATIK no
          registra el depósito hasta verificar la transacción en Stellar.
        </p>
      </div>
    </Modal>
  );
}

export function UsdcDepositList({
  depositos,
  goals,
  onAssign,
}: {
  depositos: DepositoUsdc[];
  goals: Goal[];
  onAssign?: (deposito: DepositoUsdc, goalId: string | undefined) => void;
}) {
  const goalName = (id?: string) => goals.find((g) => g.id === id)?.nombre ?? "Sin meta";
  const tone = (estado: DepositoUsdc["estado"]) =>
    estado === "confirmado" ? "menta" : estado === "fallido" ? "coral" : "lavanda";
  const label = (estado: DepositoUsdc["estado"]) =>
    estado === "confirmado" ? "Confirmado" : estado === "fallido" ? "Fallido" : "Pendiente";

  if (depositos.length === 0) {
    return (
      <p className="rounded-xl bg-petroleo-50 px-3 py-3 text-sm text-tinta-suave">
        Aún no hay depósitos USDC verificados para esta wallet.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {depositos.map((d) => (
        <li key={d.id} className="rounded-xl border border-petroleo/10 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-petroleo">
                {formatUsdc(d.importe)} USDC
              </p>
              <p className="text-xs text-tinta-suave">
                {new Date(d.createdAt).toLocaleString(uiLocaleTag(), {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <Badge tone={tone(d.estado)}>{label(d.estado)}</Badge>
          </div>
          <div className="mt-2 grid gap-1 text-xs text-tinta-suave sm:grid-cols-2">
            <p>
              Origen:{" "}
              {d.originAddress ? (
                <a
                  className={linkClass}
                  href={explorerAccountUrl(d.originAddress)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortAddr(d.originAddress)}
                </a>
              ) : (
                "no disponible"
              )}
            </p>
            <p>
              Destino:{" "}
              <a
                className={linkClass}
                href={explorerAccountUrl(d.destinationAddress)}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddr(d.destinationAddress)}
              </a>
            </p>
            <p>
              Tx:{" "}
              <a
                className={linkClass}
                href={explorerTxUrl(d.txHash)}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddr(d.txHash, 8)}
              </a>
            </p>
            <p>Meta: {goalName(d.goalId)}</p>
          </div>
          {onAssign && (
            <div className="mt-3">
              <Select
                aria-label="Clasificar depósito en meta"
                value={d.goalId ?? ""}
                onChange={(e) => onAssign(d, e.target.value || undefined)}
              >
                <option value="">Sin meta</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
