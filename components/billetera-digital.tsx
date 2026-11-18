"use client";

import { Suspense, useMemo, useState } from "react";
import { usePlatik } from "@/lib/store";
import { formatMoney } from "@/lib/format";
import { recomendarAhorroDigital } from "@/lib/savings-recommendation";
import { currencyDigits } from "@/lib/currency/catalog";
import { roundToCurrency } from "@/lib/currency/decimal";
import { Card, CardHeader, PageHeader, Button, Input, Field } from "./ui";
import { WalletExternaCard } from "./wallet-externa";
import { PollarWalletCard } from "./pollar-wallet";

function RecomendacionAhorro() {
  const { data } = usePlatik();
  const rec = useMemo(
    () => recomendarAhorroDigital(data.transactions, data.profile.moneda),
    [data.transactions, data.profile.moneda],
  );
  const [hidden, setHidden] = useState(false);
  const [editing, setEditing] = useState(false);
  const [monto, setMonto] = useState("");
  const [accepted, setAccepted] = useState(false);

  if (!rec || hidden) return null;

  const reject = () => {
    setHidden(true);
  };

  const accept = () => {
    setAccepted(true);
    setEditing(false);
  };

  const saveModified = () => {
    const n = Number(monto);
    if (!Number.isFinite(n) || n <= 0) return;
    setMonto(String(roundToCurrency(n, currencyDigits(rec.moneda))));
    setAccepted(true);
    setEditing(false);
  };

  const shownMonto = editing || accepted ? monto || String(rec.monto) : String(rec.monto);

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader
        title="Recomendación de ahorro"
        subtitle="Basada solo en tus ingresos y egresos registrados. No ejecuta transferencias ni convierte moneda."
      />
      <div className="rounded-xl bg-menta-100 px-3 py-3 text-sm text-petroleo">
        <p>
          Según tus movimientos, podrías destinar{" "}
          <strong>{formatMoney(rec.monto, rec.moneda)}</strong> a tus ahorros
          digitales (≈ {rec.porcentaje}% de un excedente de{" "}
          {formatMoney(rec.excedente, rec.moneda)}).
        </p>
        <p className="mt-1 text-xs text-tinta-suave">{rec.motivo}</p>
      </div>
      {editing && (
        <Field label="Modificar importe sugerido">
          <Input inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} />
        </Field>
      )}
      <div className="flex flex-wrap gap-2">
        {!accepted && !editing && (
          <>
            <Button onClick={accept}>Aceptar sugerencia</Button>
            <Button variant="outline" onClick={() => { setEditing(true); setMonto(String(rec.monto)); }}>
              Modificar
            </Button>
            <Button variant="outline" onClick={reject}>Rechazar</Button>
          </>
        )}
        {editing && (
          <>
            <Button onClick={saveModified}>Guardar referencia</Button>
            <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
          </>
        )}
        {accepted && (
          <p className="text-sm text-tinta-suave">
            Referencia guardada: {formatMoney(Number(shownMonto) || rec.monto, rec.moneda)}. PLATIK no mueve fondos ni convierte BOB a USDC.
          </p>
        )}
      </div>
    </Card>
  );
}

function ConversionFutura() {
  return (
    <Card className="flex flex-col gap-2">
      <CardHeader
        title="Conversión BOB → USDC (próximamente)"
        subtitle="Preparado para una futura integración con proveedores fiat-to-crypto legales en Bolivia."
      />
      <p className="text-sm text-tinta-suave">
        PLATIK no convierte ni simula conversiones. Cuando esté disponible, verás
        cotización, comisiones, red y límites antes de confirmar; la conversión
        seguirá siendo una acción explícita tuya, nunca automática.
      </p>
      <div>
        <Button disabled variant="outline">Disponible pronto</Button>
      </div>
    </Card>
  );
}

export function BilleteraDigital() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Billetera digital"
        subtitle="Ahorra USDC de prueba en Stellar Testnet sin salir de PLATIK. Elige tu wallet: conecta una existente o crea una integrada."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <WalletExternaCard />
        <Suspense
          fallback={
            <Card className="flex flex-col gap-3 p-5">
              <CardHeader title="Crear mi billetera con PLATIK" subtitle="Cargando…" />
            </Card>
          }
        >
          <PollarWalletCard />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <RecomendacionAhorro />
      </Suspense>
      <ConversionFutura />
    </div>
  );
}
