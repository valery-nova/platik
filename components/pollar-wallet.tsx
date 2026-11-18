"use client";

import { useMemo, useState } from "react";
import { PollarProvider, usePollar } from "@pollar/react";
import { usePlatik } from "@/lib/store";
import { isStellarAddress } from "@/lib/stellar/account";
import { USDC_TESTNET, USDC_TESTNET_LABEL, explorerAccountUrl, explorerTxUrl } from "@/lib/stellar/config";
import { useAddressBalances } from "@/lib/stellar/use-balance";
import { useUsdcDeposits } from "@/lib/stellar/use-deposits";
import type { DepositoUsdc } from "@/lib/types";
import { Badge, Button, Card, CardHeader, Field, Input, Modal } from "./ui";
import { UsdcDepositList, UsdcReceiveModal, formatUsdc, shortAddr } from "./usdc-ui";

const POLLAR_API_KEY = process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY;

export function PollarWalletCard() {
  if (!POLLAR_API_KEY) {
    return (
      <Card className="flex flex-col gap-3">
        <CardHeader
          title="Crear mi billetera con PLATIK"
          subtitle="Crea y protege tu wallet para ahorrar USDC de prueba."
        />
        <p className="rounded-xl bg-petroleo-50 px-3 py-3 text-sm text-tinta-suave">
          Pendiente de configuración: falta la clave pública de Pollar en el entorno de PLATIK.
        </p>
      </Card>
    );
  }
  return (
    <PollarProvider client={{ apiKey: POLLAR_API_KEY, stellarNetwork: "testnet" }}>
      <PollarWalletInner />
    </PollarProvider>
  );
}

function PollarWalletInner() {
  const p = usePollar();
  const { data, upsertDepositoUsdc } = usePlatik();
  const stellarCandidates = p.wallets.filter(
    (w) => w.chain === undefined || w.chain === "STELLAR",
  );
  const wallet =
    stellarCandidates.find((w) => isStellarAddress(w.address)) ??
    (p.wallet && isStellarAddress(p.wallet.address) ? p.wallet : null);
  const address = wallet?.address ?? null;
  const hayWalletNoClasica =
    !!p.hasWallet &&
    !address &&
    (stellarCandidates.some((w) => !isStellarAddress(w.address)) ||
      (!!p.wallet &&
        (p.wallet.chain === undefined || p.wallet.chain === "STELLAR") &&
        !isStellarAddress(p.wallet.address)));
  const { balances, loading: balLoading, error: balError, refresh: refreshBal } = useAddressBalances(address);
  const { deposits, sync } = useUsdcDeposits(address);

  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveGoal, setReceiveGoal] = useState("");
  const [receiveAmount, setReceiveAmount] = useState("");
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendDestination, setSendDestination] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendOutcome, setSendOutcome] = useState<string | null>(null);
  const [trustBusy, setTrustBusy] = useState(false);
  const [trustMsg, setTrustMsg] = useState<string | null>(null);

  const usdcBalance = useMemo(() => {
    const raw = balances?.usdc;
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [balances?.usdc]);

  const sinTrustlineUsdc = !!balances && !balances.tieneTrustlineUsdc;

  const assignGoal = (d: DepositoUsdc, goalId: string | undefined) => {
    const next: DepositoUsdc = { ...d };
    if (goalId) next.goalId = goalId;
    else delete next.goalId;
    upsertDepositoUsdc(next);
  };

  const createWallet = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await p.createWallet();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "No se pudo crear la billetera.");
    } finally {
      setAuthBusy(false);
    }
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
      setSyncMsg(err instanceof Error ? err.message : "No se pudieron buscar depósitos.");
    } finally {
      setSyncBusy(false);
    }
  };

  const closeReceive = () => {
    setReceiveOpen(false);
    void sync(receiveGoal || undefined).catch(() => undefined);
  };

  const activarTrustline = async () => {
    if (!address) return;
    setTrustBusy(true);
    setTrustMsg(null);
    try {
      const outcome = await p.setTrustline({
        code: USDC_TESTNET.code,
        issuer: USDC_TESTNET.issuer,
      });
      if (outcome.status === "success" || outcome.status === "pending") {
        setTrustMsg("Trustline USDC activada o en proceso. Ya podrás recibir USDC de prueba.");
      } else if (outcome.status === "cosign_pending") {
        setTrustMsg("La activación requiere aprobación en tu dispositivo de recuperación/co-firma.");
      } else {
        setTrustMsg(outcome.details ?? outcome.code ?? "Pollar no pudo activar la trustline.");
      }
      await refreshBal();
      void p.refreshAssets();
      void p.refreshWalletBalance();
      void sync();
    } catch (err) {
      setTrustMsg(err instanceof Error ? err.message : "No se pudo activar la trustline USDC.");
    } finally {
      setTrustBusy(false);
    }
  };

  const validAmount = /^\d+(\.\d{1,7})?$/.test(sendAmount.trim()) && Number(sendAmount) > 0;

  const submitSend = async () => {
    setSendError(null);
    setSendOutcome(null);
    const destination = sendDestination.trim();
    if (!isStellarAddress(destination)) {
      setSendError("La dirección de destino no es válida en Stellar (G... 56 caracteres).");
      return;
    }
    if (!validAmount) {
      setSendError("El importe USDC no es válido.");
      return;
    }
    setSendBusy(true);
    try {
      const outcome = await p.sendPayment({
        chain: "STELLAR",
        destination,
        amount: sendAmount.trim(),
        asset: { type: "credit_alphanum4", code: USDC_TESTNET.code, issuer: USDC_TESTNET.issuer },
      });
      if (outcome.status === "success" || outcome.status === "pending") {
        setSendOutcome(outcome.hash);
        void refreshBal();
        void sync();
      } else if (outcome.status === "cosign_pending") {
        setSendError("La wallet requiere aprobación en tu dispositivo de recuperación/co-firma.");
      } else {
        setSendError(outcome.details ?? outcome.message ?? outcome.resultCode ?? "Pollar no pudo enviar el pago.");
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "No se pudo enviar el pago.");
    } finally {
      setSendBusy(false);
    }
  };

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader
        title="Crear mi billetera con PLATIK"
        subtitle="Crea y protege tu wallet para recibir y enviar USDC de prueba."
      />
      <p className="rounded-xl bg-menta-100 px-3 py-2 text-xs text-menta-700">
        Tu wallet es tuya: PLATIK nunca ve tu clave privada. Pollar la protege y te permite recuperarla si cambias de dispositivo.
      </p>
      {p.configStatus === "error" && (
        <p className="rounded-xl bg-coral-100 px-3 py-2 text-sm text-coral-600">
          No pudimos conectar con el servicio de billeteras. <button className="underline" onClick={p.retryConfig}>Reintentar</button>
        </p>
      )}
      {!p.isAuthenticated && (
        <div className="space-y-3">
          <p className="text-sm text-tinta-suave">Entra para crear o recuperar tu wallet.</p>
          <Button onClick={p.openLoginModal} disabled={p.configStatus !== "ready"}>
            Crear mi billetera
          </Button>
        </div>
      )}
      {p.isAuthenticated && !p.hasWallet && (
        <div className="space-y-3">
          <p className="text-sm text-tinta-suave">Ya iniciaste sesión. Crea tu wallet para recibir y enviar USDC de prueba.</p>
          <Button onClick={() => void createWallet()} disabled={authBusy || !p.verified}>
            {authBusy ? "Creando…" : "Crear billetera"}
          </Button>
          {!p.verified && <p className="text-xs text-tinta-suave">Verificando sesión…</p>}
        </div>
      )}
      {authError && <p className="rounded-xl bg-coral-100 px-3 py-2 text-sm text-coral-600">{authError}</p>}
      {address && wallet && (
        <div className="space-y-4">
          <div className="rounded-xl bg-petroleo-50 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-petroleo">{shortAddr(address, 8)}</p>
              <Badge tone="menta">{wallet.custody}</Badge>
            </div>
            {wallet.provisioning === "CREATING" && <p className="mt-1 text-xs text-tinta-suave">Preparando tu wallet…</p>}
            {wallet.provisioning === "FAILED" && <p className="mt-1 text-xs text-coral-600">No se pudo preparar tu wallet. Cierra sesión y vuelve a intentarlo.</p>}
            <a className="text-xs text-petroleo underline" href={explorerAccountUrl(address)} target="_blank" rel="noreferrer">
              Ver en Stellar Explorer
            </a>
          </div>
          {p.recoveryLocked && (
            <div className="rounded-xl bg-coral-100 p-3 text-sm text-coral-600">
              <p>Primero protege tu wallet: agrega una forma de recuperarla si cambias de dispositivo.</p>
              <Button variant="outline" className="mt-2" onClick={p.openRecoveryModal}>Proteger mi wallet</Button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-petroleo/10 p-3">
              <p className="text-xs text-tinta-suave">XLM</p>
              <p className="text-lg font-semibold text-petroleo">{balances?.xlm ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-petroleo/10 p-3">
              <p className="text-xs text-tinta-suave">USDC prueba</p>
              <p className="text-lg font-semibold text-petroleo">
                {balLoading ? "…" : usdcBalance === null ? "—" : formatUsdc(usdcBalance)}
              </p>
            </div>
          </div>
          {balError && <p className="text-xs text-coral-600">{balError}</p>}
          {sinTrustlineUsdc && (
            <div className="rounded-xl bg-lavanda-50 p-3 text-sm text-petroleo">
              <p>Tu wallet aún no confía en el USDC de prueba; actívalo una vez para poder recibirlo.</p>
              <Button variant="outline" className="mt-2" onClick={() => void activarTrustline()} disabled={trustBusy || p.recoveryLocked}>
                {trustBusy ? "Activando…" : "Activar USDC en mi wallet"}
              </Button>
              {trustMsg && <p className="mt-2 text-xs text-tinta-suave">{trustMsg}</p>}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { setReceiveGoal(""); setReceiveAmount(""); setReceiveOpen(true); }} disabled={p.recoveryLocked || sinTrustlineUsdc}>
              Recibir
            </Button>
            <Button variant="outline" onClick={() => { setSendError(null); setSendOutcome(null); setSendOpen(true); }} disabled={p.recoveryLocked || sinTrustlineUsdc}>
              Enviar
            </Button>
            <Button variant="outline" onClick={() => void runSync()} disabled={syncBusy || p.recoveryLocked}>
              {syncBusy ? "Buscando…" : "Buscar depósitos"}
            </Button>
            <Button variant="outline" onClick={() => void refreshBal()}>Actualizar</Button>
          </div>
          {p.recoveryLocked && <p className="text-xs text-coral-600">Primero protege tu wallet para poder recibir o enviar.</p>}
          {syncMsg && <p className="text-sm text-tinta-suave">{syncMsg}</p>}
          <p className="text-xs text-tinta-suave">{USDC_TESTNET_LABEL}</p>
          <div className="space-y-2">
            <p className="text-sm font-medium text-petroleo">Depósitos recibidos</p>
            <UsdcDepositList depositos={deposits} goals={data.goals} onAssign={assignGoal} />
          </div>
        </div>
      )}
      {p.isAuthenticated && p.hasWallet && !address && hayWalletNoClasica && (
        <div className="space-y-3 rounded-xl bg-lavanda-50 p-3 text-sm text-petroleo">
          <p>
            Tu wallet Pollar usa una smart wallet: PLATIK no puede mostrar QR/dirección
            clásica ni verificar depósitos entrantes por Horizon, pero sí permite enviar USDC.
          </p>
          {p.recoveryLocked && (
            <Button variant="outline" onClick={p.openRecoveryModal}>Proteger mi wallet</Button>
          )}
          <Button
            variant="outline"
            onClick={() => { setSendError(null); setSendOutcome(null); setSendOpen(true); }}
            disabled={p.recoveryLocked}
          >
            Enviar USDC
          </Button>
        </div>
      )}
      {p.isAuthenticated && p.hasWallet && !address && !hayWalletNoClasica && (
        <p className="text-sm text-tinta-suave">Tu wallet está provisionándose. Espera unos segundos y pulsa Actualizar.</p>
      )}
      {p.isAuthenticated && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => p.logout()}>Cerrar sesión</Button>
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
          <Field label="Dirección destino Stellar" hint="Cuenta válida de Stellar Testnet (G...).">
            <Input value={sendDestination} onChange={(e) => setSendDestination(e.target.value)} placeholder="G..." />
          </Field>
          <Field label="Importe USDC">
            <Input inputMode="decimal" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} placeholder="Ej. 10" />
          </Field>
          {sendError && <p className="rounded-xl bg-coral-100 px-3 py-2 text-sm text-coral-600">{sendError}</p>}
          {sendOutcome && (
            <p className="text-sm text-petroleo">
              Enviada. Hash:{" "}
              <a className="underline" href={explorerTxUrl(sendOutcome)} target="_blank" rel="noreferrer">{shortAddr(sendOutcome, 8)}</a>
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSendOpen(false)}>Cerrar</Button>
            <Button onClick={() => void submitSend()} disabled={sendBusy || !p.hasWallet || p.recoveryLocked}>
              {sendBusy ? "Enviando…" : "Enviar"}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
