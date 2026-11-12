"use client";

/**
 * Sección "Ahorro on-chain" de /panel/metas: wallet, trustline, aporte USDC
 * de prueba en Stellar Testnet e historial verificado en Horizon.
 */
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Link2,
  LogOut,
  RefreshCw,
  Send,
  ShieldCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import { Badge, Button, Card, CardHeader, Field, Input, Modal, Select } from "@/components/ui";
import { usePlatik } from "@/lib/store";
import {
  CIRCLE_FAUCET_URL,
  explorerAccountUrl,
  explorerTxUrl,
  friendbotUrl,
  getTestnetRecipient,
  USDC_TESTNET,
  USDC_TESTNET_LABEL,
} from "@/lib/stellar/config";
import {
  crearAporteStellar,
  ESTADO_APORTE_LABEL,
  transicionarAporteStellar,
} from "@/lib/stellar/aporte";
import { toStellarError } from "@/lib/stellar/errors";
import { parseUsdcAmount, signAndSubmitUsdcPayment } from "@/lib/stellar/payment";
import { ensureUsdcTrustline } from "@/lib/stellar/trustline";
import type { AporteStellar, AporteStellarEstado } from "@/lib/stellar/types";
import { useStellarWallet } from "@/lib/stellar/use-wallet";
import { getTransactionStatus, waitForConfirmation } from "@/lib/stellar/verify";

function corto(addr: string, n = 6) {
  return addr.length > n * 2 ? `${addr.slice(0, n)}…${addr.slice(-n)}` : addr;
}

function formatUsdc(n: number | string) {
  const v = typeof n === "string" ? Number(n) : n;
  return `${v.toLocaleString("es-BO", { maximumFractionDigits: 7 })} USDC`;
}

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-BO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ESTADO_TONE: Record<
  AporteStellarEstado,
  "neutral" | "menta" | "coral" | "lavanda"
> = {
  preparado: "neutral",
  firma_solicitada: "lavanda",
  enviada: "lavanda",
  confirmada: "menta",
  fallida: "coral",
  cancelada: "neutral",
};

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `ap-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium text-menta-700 hover:underline"
    >
      {children} <ExternalLink size={12} />
    </a>
  );
}

function Aviso({
  tone,
  children,
}: {
  tone: "coral" | "lavanda" | "menta";
  children: React.ReactNode;
}) {
  const tones = {
    coral: "bg-coral-50 text-coral-600",
    lavanda: "bg-lavanda-50 text-tinta-suave",
    menta: "bg-menta-50 text-menta-700",
  };
  return (
    <div className={`flex gap-2 rounded-xl px-3.5 py-2.5 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}

type Paso = "form" | "revision" | "firmando" | "enviada" | "confirmada" | "fallida" | "cancelada";

export function StellarAhorro() {
  const { data, upsertAporteStellar } = usePlatik();
  const w = useStellarWallet();
  const recipient = getTestnetRecipient();

  const [trustState, setTrustState] = useState<"idle" | "firmando" | "error">("idle");
  const [trustError, setTrustError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [paso, setPaso] = useState<Paso>("form");
  const [goalId, setGoalId] = useState("");
  const [monto, setMonto] = useState("");
  const [formError, setFormError] = useState("");
  const [actual, setActual] = useState<AporteStellar | null>(null);

  const goals = data.goals;
  const aportes = data.aportesStellar;
  const goalNombre = (id: string) => goals.find((g) => g.id === id)?.nombre ?? "Meta eliminada";

  // Recupera aportes pendientes tras recargar: solo Horizon decide si se confirmaron.
  const recuperado = useRef(false);
  useEffect(() => {
    if (recuperado.current) return;
    recuperado.current = true;
    for (const a of aportes) {
      if (a.estado === "enviada" && a.txHash) {
        const hash = a.txHash;
        void getTransactionStatus(hash)
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
                  }),
            );
          })
          .catch(() => {
            // Sin red: se deja "enviada" y se puede reverificar a mano.
          });
      } else if (a.estado === "firma_solicitada" || a.estado === "preparado") {
        // La sesión se interrumpió antes de enviar: el XDR no se guarda, no hay nada que recuperar.
        upsertAporteStellar(
          transicionarAporteStellar(a, "cancelada", {
            error: "Interrumpido antes de enviarse (la página se recargó o cerró).",
          }),
        );
      }
    }
  }, [aportes, upsertAporteStellar]);

  const confirmadoTotal = aportes
    .filter((a) => a.estado === "confirmada")
    .reduce((s, a) => s + a.importe, 0);

  const sinCuenta = w.accountError?.code === "account_not_found";
  const sinTrustline = !!w.balances && !w.balances.tieneTrustlineUsdc;
  const usdcDisponible = w.balances?.usdc ? Number(w.balances.usdc) : 0;
  const listoParaAportar =
    w.status === "connected" && !!w.balances?.tieneTrustlineUsdc && !!recipient;

  async function crearTrustline() {
    if (!w.wallet) return;
    setTrustState("firmando");
    setTrustError("");
    try {
      await ensureUsdcTrustline(w.wallet.address);
      setTrustState("idle");
      await w.refreshBalances();
    } catch (err) {
      const e = toStellarError(err);
      setTrustState("error");
      setTrustError(e.code === "wallet_rejected" ? "Rechazaste la firma en la wallet." : e.message);
    }
  }

  function abrirAporte() {
    const usdcGoal = goals.find((g) => /usdc|d[oó]lar/i.test(g.nombre));
    setGoalId(usdcGoal?.id ?? goals[0]?.id ?? "");
    setMonto("");
    setFormError("");
    setActual(null);
    setPaso("form");
    setModalOpen(true);
  }

  function revisar() {
    setFormError("");
    if (!goalId) {
      setFormError("Elige una meta de ahorro.");
      return;
    }
    try {
      parseUsdcAmount(monto);
    } catch {
      setFormError("Ingresa un importe positivo (hasta 7 decimales).");
      return;
    }
    const importe = Number(monto.replace(",", "."));
    if (importe > usdcDisponible) {
      setFormError(`Saldo insuficiente: tienes ${formatUsdc(usdcDisponible)}.`);
      return;
    }
    if (!w.wallet) return;
    try {
      const a = crearAporteStellar({
        id: newId(),
        goalId,
        walletOrigen: w.wallet.address,
        importe,
      });
      upsertAporteStellar(a);
      setActual(a);
      setPaso("revision");
    } catch (err) {
      setFormError(toStellarError(err).message);
    }
  }

  function cancelarRevision() {
    if (actual) upsertAporteStellar(transicionarAporteStellar(actual, "cancelada"));
    setPaso("cancelada");
  }

  async function firmarYEnviar() {
    if (!actual || !w.wallet) return;
    let a = transicionarAporteStellar(actual, "firma_solicitada");
    upsertAporteStellar(a);
    setActual(a);
    setPaso("firmando");

    let hash: string;
    try {
      const res = await signAndSubmitUsdcPayment({
        sourceAddress: w.wallet.address,
        amountInput: monto,
        memoText: "PLATIK ahorro",
      });
      hash = res.txHash;
    } catch (err) {
      const e = toStellarError(err);
      const rechazado = e.code === "wallet_rejected";
      a = transicionarAporteStellar(a, rechazado ? "cancelada" : "fallida", {
        error: rechazado ? "Rechazaste la firma en la wallet." : e.message,
      });
      upsertAporteStellar(a);
      setActual(a);
      setPaso(rechazado ? "cancelada" : "fallida");
      return;
    }

    a = transicionarAporteStellar(a, "enviada", { txHash: hash });
    upsertAporteStellar(a);
    setActual(a);
    setPaso("enviada");

    try {
      const s = await waitForConfirmation(hash);
      a = s.successful
        ? transicionarAporteStellar(a, "confirmada", {
            confirmedAt: s.closedAt ?? undefined,
            ledger: s.ledger ?? undefined,
          })
        : transicionarAporteStellar(a, "fallida", {
            ledger: s.ledger ?? undefined,
            error: "Horizon registró la transacción como fallida.",
          });
      upsertAporteStellar(a);
      setActual(a);
      setPaso(s.successful ? "confirmada" : "fallida");
      void w.refreshBalances();
    } catch {
      // Sigue "enviada": se reverifica al recargar o con el botón del historial.
    }
  }

  async function reverificar(a: AporteStellar) {
    if (!a.txHash) return;
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
            }),
      );
    } catch {
      // Horizon no disponible: se mantiene el estado actual.
    }
  }

  const enCurso = paso === "firmando" || paso === "enviada";

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-petroleo">Ahorro on-chain</h2>
          <p className="mt-0.5 text-sm text-tinta-suave">
            Aportes reales en Stellar Testnet, firmados desde tu propia wallet.
          </p>
        </div>
        <Badge tone="lavanda">{USDC_TESTNET_LABEL}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Wallet */}
        <Card className="p-5 lg:col-span-2">
          <CardHeader
            title="Tu wallet Stellar"
            subtitle="Varial (antes Freighter) · solo red de pruebas"
            action={
              w.status === "connected" ? (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => void w.refreshBalances()}
                    aria-label="Actualizar saldos"
                    className="rounded-lg border border-petroleo/15 p-2 text-tinta-suave hover:text-petroleo"
                  >
                    <RefreshCw size={14} className={w.balancesLoading ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={() => void w.disconnect()}
                    aria-label="Desconectar wallet"
                    className="rounded-lg border border-petroleo/15 p-2 text-tinta-suave hover:text-coral-600"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              ) : null
            }
          />

          {w.status === "checking" && (
            <p className="flex items-center gap-2 text-sm text-tinta-suave">
              <Loader2 size={15} className="animate-spin" /> Buscando la extensión de wallet…
            </p>
          )}

          {w.status === "not_installed" && (
            <div className="space-y-3">
              <Aviso tone="lavanda">
                <Wallet size={16} className="mt-0.5 shrink-0" />
                <span>
                  No detectamos ninguna wallet Stellar. Instala la extensión{" "}
                  <ExtLink href="https://www.freighter.app/">Varial / Freighter</ExtLink>, crea o
                  importa una cuenta, cambia la red a <strong>Testnet</strong> y vuelve aquí.
                </span>
              </Aviso>
              <Button variant="outline" onClick={() => void w.recheck()}>
                <RefreshCw size={15} /> Ya la instalé, volver a comprobar
              </Button>
            </div>
          )}

          {(w.status === "disconnected" || w.status === "connecting" || w.status === "error") && (
            <div className="space-y-3">
              {w.status === "error" && w.error && (
                <Aviso tone="coral">
                  <XCircle size={16} className="mt-0.5 shrink-0" />
                  <span>
                    {w.error.code === "wallet_rejected"
                      ? "Rechazaste la conexión en la wallet. Puedes intentarlo de nuevo."
                      : w.error.message}
                  </span>
                </Aviso>
              )}
              <p className="text-sm text-tinta-suave">
                Conecta tu wallet para ver tus saldos de prueba y aportar a tus metas. PLATIK
                nunca te pedirá tu frase semilla ni claves privadas.
              </p>
              <Button
                variant="accent"
                onClick={() => void w.connect()}
                disabled={w.status === "connecting"}
              >
                {w.status === "connecting" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Link2 size={15} />
                )}
                {w.status === "connecting" ? "Esperando la wallet…" : "Conectar wallet"}
              </Button>
            </div>
          )}

          {w.status === "wrong_network" && (
            <div className="space-y-3">
              <Aviso tone="coral">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>
                  {w.error?.message ??
                    "Tu wallet no está en Testnet."}{" "}
                  Abre la extensión → Configuración → Red → <strong>Testnet</strong>.
                </span>
              </Aviso>
              <Button variant="outline" onClick={() => void w.connect()}>
                <RefreshCw size={15} /> Ya cambié la red
              </Button>
            </div>
          )}

          {w.status === "connected" && w.wallet && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge tone="menta">
                  <CheckCircle2 size={12} /> Conectada
                </Badge>
                <Badge tone="lavanda">Testnet</Badge>
                <ExtLink href={explorerAccountUrl(w.wallet.address)}>
                  <span className="font-mono">{corto(w.wallet.address)}</span>
                </ExtLink>
              </div>

              {sinCuenta ? (
                <Aviso tone="coral">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>
                    Tu cuenta aún no existe en Testnet. Actívala con XLM de prueba gratis desde{" "}
                    <ExtLink href={friendbotUrl(w.wallet.address)}>Friendbot</ExtLink> y luego
                    actualiza los saldos.
                  </span>
                </Aviso>
              ) : w.accountError ? (
                <Aviso tone="coral">
                  <XCircle size={16} className="mt-0.5 shrink-0" />
                  <span>No pudimos leer tu cuenta en Horizon: {w.accountError.message}</span>
                </Aviso>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-petroleo-50 p-3">
                    <p className="text-xs text-tinta-suave">XLM de prueba (comisiones)</p>
                    <p className="mt-1 text-lg font-bold text-petroleo">
                      {w.balances ? Number(w.balances.xlm).toLocaleString("es-BO", { maximumFractionDigits: 4 }) : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-menta-50 p-3">
                    <p className="text-xs text-tinta-suave">USDC de prueba</p>
                    <p className="mt-1 text-lg font-bold text-petroleo">
                      {w.balances?.usdc != null ? formatUsdc(w.balances.usdc) : "Sin trustline"}
                    </p>
                  </div>
                </div>
              )}

              {sinTrustline && (
                <div className="space-y-2">
                  <Aviso tone="lavanda">
                    <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                    <span>
                      Para recibir USDC de prueba tu cuenta necesita una <strong>trustline</strong>{" "}
                      con el emisor oficial de Circle en Testnet (
                      <span className="font-mono">{corto(USDC_TESTNET.issuer)}</span>). Se crea una
                      sola vez y la firmas tú en la wallet.
                    </span>
                  </Aviso>
                  {trustState === "error" && (
                    <Aviso tone="coral">
                      <XCircle size={16} className="mt-0.5 shrink-0" />
                      <span>{trustError}</span>
                    </Aviso>
                  )}
                  <Button
                    variant="accent"
                    onClick={() => void crearTrustline()}
                    disabled={trustState === "firmando"}
                  >
                    {trustState === "firmando" ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={15} />
                    )}
                    {trustState === "firmando" ? "Firma en tu wallet…" : "Crear trustline USDC"}
                  </Button>
                </div>
              )}

              {w.balances?.tieneTrustlineUsdc && usdcDisponible === 0 && (
                <Aviso tone="lavanda">
                  <Wallet size={16} className="mt-0.5 shrink-0" />
                  <span>
                    No tienes USDC de prueba. Pide 20 USDC gratis en el{" "}
                    <ExtLink href={CIRCLE_FAUCET_URL}>Circle Faucet</ExtLink> (elige Stellar
                    Testnet y pega tu dirección) y luego actualiza los saldos.
                  </span>
                </Aviso>
              )}

              {!recipient && (
                <Aviso tone="coral">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>
                    Falta configurar la dirección receptora de Testnet
                    (<span className="font-mono">NEXT_PUBLIC_STELLAR_TESTNET_RECIPIENT</span>). Los
                    aportes están deshabilitados hasta configurarla.
                  </span>
                </Aviso>
              )}

              <Button
                variant="accent"
                onClick={abrirAporte}
                disabled={!listoParaAportar || usdcDisponible === 0 || goals.length === 0}
              >
                <Send size={15} /> Aportar USDC a una meta
              </Button>
            </div>
          )}
        </Card>

        {/* Resumen */}
        <Card className="flex flex-col justify-between p-5">
          <div>
            <p className="text-sm text-tinta-suave">Total confirmado en Stellar</p>
            <p className="mt-1.5 text-2xl font-bold text-petroleo">{formatUsdc(confirmadoTotal)}</p>
            <p className="mt-1 text-xs text-tinta-suave">
              {aportes.filter((a) => a.estado === "confirmada").length} aporte(s) verificados en
              Horizon
            </p>
          </div>
          <p className="mt-4 text-xs text-tinta-suave">
            Solo cuenta como confirmado lo que Horizon registra como exitoso. Los USDC de prueba no
            tienen valor real y no se suman a tus metas en Bs.
          </p>
        </Card>
      </div>

      {/* Historial */}
      <Card className="p-5">
        <CardHeader title="Historial de aportes on-chain" subtitle="Guardado en este navegador" />
        {aportes.length === 0 ? (
          <p className="text-sm text-tinta-suave">Aún no hay aportes on-chain.</p>
        ) : (
          <ul className="divide-y divide-petroleo/6">
            {aportes.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-tinta">
                    {formatUsdc(a.importe)} → {goalNombre(a.goalId)}
                  </p>
                  <p className="text-xs text-tinta-suave">
                    {formatFechaHora(a.confirmedAt ?? a.createdAt)}
                    {a.ledger ? ` · ledger ${a.ledger}` : ""}
                  </p>
                  {a.txHash && (
                    <p className="text-xs">
                      <ExtLink href={explorerTxUrl(a.txHash)}>
                        <span className="font-mono">{corto(a.txHash, 8)}</span>
                      </ExtLink>
                    </p>
                  )}
                  {a.error && <p className="text-xs text-coral-600">{a.error}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={ESTADO_TONE[a.estado]}>{ESTADO_APORTE_LABEL[a.estado]}</Badge>
                  {a.estado === "enviada" && (
                    <button
                      onClick={() => void reverificar(a)}
                      className="text-xs font-medium text-menta-700 hover:underline"
                    >
                      Reverificar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Modal de aporte */}
      <Modal
        open={modalOpen}
        onClose={() => {
          if (enCurso) return;
          if (paso === "revision") cancelarRevision();
          setModalOpen(false);
        }}
        title="Aporte USDC en Stellar Testnet"
      >
        {paso === "form" && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              revisar();
            }}
          >
            <Field label="Meta de ahorro">
              <Select value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Importe (USDC de prueba)" hint={`Disponible: ${formatUsdc(usdcDisponible)}`}>
              <Input
                inputMode="decimal"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                autoFocus
                required
              />
            </Field>
            {formError && (
              <p className="rounded-xl bg-coral-50 px-3.5 py-2.5 text-sm text-coral-600">{formError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="accent">
                Revisar aporte
              </Button>
            </div>
          </form>
        )}

        {paso === "revision" && actual && (
          <div className="space-y-4">
            <dl className="space-y-2 rounded-xl bg-petroleo-50 p-4 text-sm">
              {[
                ["Meta", goalNombre(actual.goalId)],
                ["Importe", formatUsdc(actual.importe)],
                ["Activo", `${actual.assetCode} · emisor ${corto(actual.assetIssuer)}`],
                ["Desde", corto(actual.walletOrigen)],
                ["Hacia", corto(actual.direccionReceptora)],
                ["Red", "Stellar Testnet"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-tinta-suave">{k}</dt>
                  <dd className="text-right font-medium text-petroleo">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-tinta-suave">
              {USDC_TESTNET_LABEL}. Tu wallet te mostrará la transacción para que la firmes; PLATIK
              no puede firmar por ti.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={cancelarRevision}>
                Cancelar
              </Button>
              <Button variant="accent" onClick={() => void firmarYEnviar()}>
                <Send size={15} /> Firmar y enviar
              </Button>
            </div>
          </div>
        )}

        {paso === "firmando" && (
          <p className="flex items-center gap-2 text-sm text-tinta-suave">
            <Loader2 size={16} className="animate-spin" /> Revisa y firma la transacción en tu
            wallet…
          </p>
        )}

        {paso === "enviada" && actual?.txHash && (
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2 text-tinta-suave">
              <Loader2 size={16} className="animate-spin" /> Enviada. Esperando confirmación de
              Horizon…
            </p>
            <ExtLink href={explorerTxUrl(actual.txHash)}>
              <span className="font-mono">{corto(actual.txHash, 8)}</span>
            </ExtLink>
          </div>
        )}

        {paso === "confirmada" && actual && (
          <div className="space-y-3 text-sm">
            <Aviso tone="menta">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>
                ¡Aporte confirmado en Stellar Testnet! {formatUsdc(actual.importe)} a “
                {goalNombre(actual.goalId)}”.
              </span>
            </Aviso>
            <dl className="space-y-1.5">
              {actual.confirmedAt && (
                <div className="flex justify-between">
                  <dt className="text-tinta-suave">Fecha</dt>
                  <dd>{formatFechaHora(actual.confirmedAt)}</dd>
                </div>
              )}
              {actual.ledger && (
                <div className="flex justify-between">
                  <dt className="text-tinta-suave">Ledger</dt>
                  <dd>{actual.ledger}</dd>
                </div>
              )}
              {actual.txHash && (
                <div className="flex justify-between">
                  <dt className="text-tinta-suave">Hash</dt>
                  <dd>
                    <ExtLink href={explorerTxUrl(actual.txHash)}>
                      <span className="font-mono">{corto(actual.txHash, 8)}</span>
                    </ExtLink>
                  </dd>
                </div>
              )}
            </dl>
            <div className="flex justify-end">
              <Button variant="accent" onClick={() => setModalOpen(false)}>
                Listo
              </Button>
            </div>
          </div>
        )}

        {(paso === "fallida" || paso === "cancelada") && (
          <div className="space-y-3">
            <Aviso tone={paso === "fallida" ? "coral" : "lavanda"}>
              <XCircle size={16} className="mt-0.5 shrink-0" />
              <span>
                {paso === "fallida" ? "El aporte falló. " : "Aporte cancelado. "}
                {actual?.error ?? "No se envió ninguna transacción."}
              </span>
            </Aviso>
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
