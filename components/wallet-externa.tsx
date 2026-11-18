"use client";

import { useMemo, useState } from "react";
import { usePlatik } from "@/lib/store";
import { isStellarAddress } from "@/lib/stellar/account";
import { USDC_TESTNET, USDC_TESTNET_LABEL, explorerAccountUrl } from "@/lib/stellar/config";
import { toStellarError } from "@/lib/stellar/errors";
import { parseUsdcAmount, signAndSubmitUsdcPayment } from "@/lib/stellar/payment";
import { ensureUsdcTrustline } from "@/lib/stellar/trustline";
import { waitForConfirmation } from "@/lib/stellar/verify";
import { useStellarWallet } from "@/lib/stellar/use-wallet";
import { useUsdcDeposits } from "@/lib/stellar/use-deposits";
import type { DepositoUsdc } from "@/lib/types";
import { Button, Card, CardHeader, Field, Input, Modal } from "./ui";
import { UsdcDepositList, UsdcReceiveModal, formatUsdc, shortAddr } from "./usdc-ui";

export function WalletExternaCard() {
  const w = useStellarWallet();
  const { data, upsertDepositoUsdc } = usePlatik();
  const address = w.wallet?.address ?? null;
  const { deposits, sync } = useUsdcDeposits(address);

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveGoal, setReceiveGoal] = useState("");
  const [receiveAmount, setReceiveAmount] = useState("");
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const [sendOpen, setSendOpen] = useState(false);
  const [sendDestination, setSendDestination] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendMemo, setSendMemo] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendHash, setSendHash] = useState<string | null>(null);
  const [trustBusy, setTrustBusy] = useState(false);
  const [trustMsg, setTrustMsg] = useState<string | null>(null);

  const usdcBalance = useMemo(() => {
    const raw = w.balances?.usdc;
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [w.balances?.usdc]);

  const sinTrustlineUsdc = !!w.balances && !w.balances.tieneTrustlineUsdc;

  const assignGoal = (d: DepositoUsdc, goalId: string | undefined) => {
    const next: DepositoUsdc = { ...d };
    if (goalId) next.goalId = goalId;
    else delete next.goalId;
    upsertDepositoUsdc(next);
  };

  const runSync = async () => {
    if (!address) return;
    setSyncBusy(true);
    setSyncMsg(null);
    try {
      const synced = await sync(receiveGoal || undefined);
      const confirmed = synced.filter((d) => d.estado === "confirmado").length;
      setSyncMsg(`${synced.length} depósito(s) USDC · ${confirmed} confirmado(s).`);
    } catch (err) {
      setSyncMsg(toStellarError(err, "horizon_error").message);
    } finally {
      setSyncBusy(false);
    }
  };

  const activarTrustline = async () => {
    if (!address) return;
    setTrustBusy(true);
    setTrustMsg(null);
    try {
      await ensureUsdcTrustline(address);
      setTrustMsg("Trustline USDC activada. Ya puedes recibir USDC de prueba.");
      await w.refreshBalances();
      void sync();
    } catch (err) {
      setTrustMsg(toStellarError(err).message);
    } finally {
      setTrustBusy(false);
    }
  };

  const closeReceive = () => {
    setReceiveOpen(false);
    void sync(receiveGoal || undefined).catch(() => undefined);
  };

  const submitSend = async () => {
    if (!address) return;
    setSendError(null);
    setSendHash(null);
    const destination = sendDestination.trim();
    if (!isStellarAddress(destination)) {
      setSendError("La dirección de destino no es válida en Stellar (G... 56 caracteres).");
      return;
    }
    try {
      parseUsdcAmount(sendAmount);
    } catch {
      setSendError("El importe USDC no es válido.");
      return;
    }
    setSendBusy(true);
    try {
      await ensureUsdcTrustline(address);
      const res = await signAndSubmitUsdcPayment({
        sourceAddress: address,
        amountInput: sendAmount,
        destination,
        memoText: sendMemo.trim() || undefined,
      });
      setSendHash(res.txHash);
      void waitForConfirmation(res.txHash, { timeoutMs: 45000, intervalMs: 3000 })
        .catch(() => undefined)
        .finally(() => {
          void w.refreshBalances();
          void sync();
        });
    } catch (err) {
      setSendError(toStellarError(err).message);
    } finally {
      setSendBusy(false);
    }
  };

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader
        title="Ya tengo una wallet Stellar"
        subtitle="Conecta Freighter/Varial. PLATIK solo ve tu dirección pública; la firma ocurre en tu wallet."
      />
      {w.status === "checking" && <p className="text-sm text-tinta-suave">Comprobando wallet…</p>}
      {w.status === "not_installed" && (
        <div className="space-y-3 text-sm text-tinta-suave">
          <p>No detectamos una wallet Stellar. Instala <strong>Freighter</strong> o <strong>Varial</strong> y vuelve a intentarlo.</p>
          <Button variant="outline" onClick={() => void w.recheck()}>Volver a comprobar</Button>
        </div>
      )}
      {w.status === "wrong_network" && (
        <p className="rounded-xl bg-coral-100 px-3 py-2 text-sm text-coral-600">{w.error?.message}</p>
      )}
      {w.status === "error" && w.error && (
        <p className="rounded-xl bg-coral-100 px-3 py-2 text-sm text-coral-600">{w.error.message}</p>
      )}
      {(w.status === "disconnected" || w.status === "connecting") && (
        <Button onClick={() => void w.connect()} disabled={w.status === "connecting"}>
          {w.status === "connecting" ? "Conectando…" : "Conectar wallet"}
        </Button>
      )}
      {address && (
        <div className="space-y-4">
          <div className="rounded-xl bg-petroleo-50 p-3 text-sm">
            <p className="font-medium text-petroleo">{shortAddr(address, 8)}</p>
            <a className="text-xs text-petroleo underline" href={explorerAccountUrl(address)} target="_blank" rel="noreferrer">
              Ver en Stellar Explorer
            </a>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-petroleo/10 p-3">
              <p className="text-xs text-tinta-suave">XLM</p>
              <p className="text-lg font-semibold text-petroleo">{w.balances?.xlm ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-petroleo/10 p-3">
              <p className="text-xs text-tinta-suave">USDC prueba</p>
              <p className="text-lg font-semibold text-petroleo">
                {usdcBalance === null ? "—" : formatUsdc(usdcBalance)}
              </p>
            </div>
          </div>
          {sinTrustlineUsdc && (
            <div className="rounded-xl bg-lavanda-50 p-3 text-sm text-petroleo">
              <p>Tu wallet aún no confía en el USDC de prueba; actívalo una vez para poder recibirlo.</p>
              <Button variant="outline" className="mt-2" onClick={() => void activarTrustline()} disabled={trustBusy}>
                {trustBusy ? "Activando…" : "Activar USDC en mi wallet"}
              </Button>
              {trustMsg && <p className="mt-2 text-xs text-tinta-suave">{trustMsg}</p>}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={sinTrustlineUsdc}
              onClick={() => { setReceiveGoal(""); setReceiveAmount(""); setReceiveOpen(true); }}
            >
              Recibir
            </Button>
            <Button variant="outline" onClick={() => { setSendError(null); setSendHash(null); setSendOpen(true); }}>
              Enviar
            </Button>
            <Button variant="outline" onClick={() => void runSync()} disabled={syncBusy}>
              {syncBusy ? "Buscando…" : "Buscar depósitos"}
            </Button>
            <Button variant="outline" onClick={() => void w.refreshBalances()}>Actualizar</Button>
            <Button variant="outline" onClick={() => void w.disconnect()}>Desconectar</Button>
          </div>
          {syncMsg && <p className="text-sm text-tinta-suave">{syncMsg}</p>}
          <p className="text-xs text-tinta-suave">{USDC_TESTNET_LABEL} · Activo {USDC_TESTNET.code}</p>
          <div className="space-y-2">
            <p className="text-sm font-medium text-petroleo">Depósitos recibidos</p>
            <UsdcDepositList depositos={deposits} goals={data.goals} onAssign={assignGoal} />
          </div>
        </div>
      )}

      <UsdcReceiveModal
        open={receiveOpen}
        onClose={closeReceive}
        address={address ?? ""}
        goals={data.goals}
        goalId={receiveGoal}
        onGoalChange={setReceiveGoal}
        amount={receiveAmount}
        onAmountChange={setReceiveAmount}
      />

      <Modal open={sendOpen} onClose={() => setSendOpen(false)} title="Enviar USDC">
        <div className="space-y-3">
          <Field label="Dirección destino Stellar" hint="Debe ser una cuenta válida de Stellar Testnet (G...).">
            <Input value={sendDestination} onChange={(e) => setSendDestination(e.target.value)} placeholder="G..." />
          </Field>
          <Field label="Importe USDC">
            <Input inputMode="decimal" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} placeholder="Ej. 10" />
          </Field>
          <Field label="Memo (opcional)" hint="Máximo 28 caracteres; queda en la transacción.">
            <Input value={sendMemo} onChange={(e) => setSendMemo(e.target.value.slice(0, 28))} placeholder="Ahorro viaje" />
          </Field>
          {sendError && <p className="rounded-xl bg-coral-100 px-3 py-2 text-sm text-coral-600">{sendError}</p>}
          {sendHash && (
            <p className="text-sm text-petroleo">
              Enviada. Hash:{" "}
              <a className="underline" href={`https://stellar.expert/explorer/testnet/tx/${sendHash}`} target="_blank" rel="noreferrer">
                {shortAddr(sendHash, 8)}
              </a>
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSendOpen(false)}>Cerrar</Button>
            <Button onClick={() => void submitSend()} disabled={sendBusy || !address}>
              {sendBusy ? "Firmando…" : "Enviar"}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
