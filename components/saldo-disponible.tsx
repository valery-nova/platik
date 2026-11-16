"use client";

import { useState } from "react";
import { Check, Plus, Trash2, Wallet } from "lucide-react";
import { Button, Card, CardHeader, Input, Select } from "@/components/ui";
import { usePlatik } from "@/lib/store";
import { saldoDisponible } from "@/lib/balance";
import { formatFecha, formatMoney } from "@/lib/format";
import { hoyISO } from "@/lib/finance";
import { currencyDigits, currencyStep, listCurrencies } from "@/lib/currency/catalog";
import { roundToCurrency } from "@/lib/currency/decimal";
import { buildConversionFields } from "@/lib/currency/rates";
import { getRateService } from "@/lib/currency/service";

async function conversionFor(from: string, to: string, amount: number) {
  if (from.toUpperCase() === to.toUpperCase()) return {};
  const { quote } = await getRateService().quote(from, to);
  return buildConversionFields(from, to, amount, quote);
}

export function SaldoDisponibleCard() {
  const {
    data,
    hydrated,
    setOpeningBalance,
    addBalanceAdjustment,
    deleteBalanceAdjustment,
  } = usePlatik();
  const moneda = data.profile.moneda;
  const saldo = saldoDisponible(data, moneda);
  const [formAjuste, setFormAjuste] = useState({ direccion: "entrada" as "entrada" | "salida", monto: "", moneda, fecha: hoyISO(), descripcion: "" });
  const [formSaldo, setFormSaldo] = useState({ monto: "", moneda, fecha: "" });
  const [aviso, setAviso] = useState("");

  if (!hydrated) return null;

  function notify(msg: string) {
    setAviso(msg);
    setTimeout(() => setAviso(""), 3000);
  }

  async function guardarSaldo() {
    const monto = Number(formSaldo.monto);
    if (!(monto > 0) || roundToCurrency(monto, currencyDigits(formSaldo.moneda)) <= 0) {
      notify("El saldo inicial debe ser válido para la moneda elegida.");
      return;
    }
    const conversion = await conversionFor(formSaldo.moneda, moneda, monto);
    setOpeningBalance({
      monto: roundToCurrency(monto, currencyDigits(formSaldo.moneda)),
      moneda: formSaldo.moneda.toUpperCase(),
      fecha: formSaldo.fecha || hoyISO(),
      descripcion: "Saldo de apertura",
      ...conversion,
    });
    notify("Saldo inicial registrado como apertura.");
  }

  async function guardarAjuste() {
    const abs = Number(formAjuste.monto);
    if (!(abs > 0) || roundToCurrency(abs, currencyDigits(formAjuste.moneda)) <= 0 || formAjuste.descripcion.trim().length < 2) {
      notify("Revisa el ajuste: monto válido y descripción obligatoria.");
      return;
    }
    const signo = formAjuste.direccion === "entrada" ? 1 : -1;
    const conversion = await conversionFor(formAjuste.moneda, moneda, abs);
    if (conversion.baseAmount !== undefined) conversion.baseAmount = roundToCurrency(conversion.baseAmount * signo, currencyDigits(moneda));
    addBalanceAdjustment({
      monto: roundToCurrency(abs * signo, currencyDigits(formAjuste.moneda)),
      moneda: formAjuste.moneda.toUpperCase(),
      fecha: formAjuste.fecha || hoyISO(),
      descripcion: formAjuste.descripcion.trim(),
      ...conversion,
    });
    setFormAjuste((f) => ({ ...f, monto: "", descripcion: "" }));
    notify("Ajuste registrado de forma trazable.");
  }

  return (
    <Card className="p-6">
      <CardHeader title="Saldo y dinero disponible" subtitle="Apertura + ajustes + todos tus movimientos" />
      {aviso && <p className="mb-3 rounded-xl bg-menta-100 px-4 py-2.5 text-sm font-medium text-menta-700">{aviso}</p>}

      <div className="rounded-xl bg-menta-50 px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-tinta-suave">Dinero disponible</span>
          <span className="text-lg font-bold text-petroleo">
            {saldo.monto === null ? "No determinable" : formatMoney(saldo.monto, moneda)}
          </span>
        </div>
        <p className="mt-1 text-xs text-tinta-suave">{saldo.motivo}</p>
      </div>

      <div className="mt-4 space-y-4">
        <div className="rounded-2xl border border-petroleo/10 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-petroleo"><Wallet size={16} className="text-menta-700" /> Saldo inicial</p>
          {data.openingBalance ? (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-tinta">
                {formatMoney(data.openingBalance.monto, data.openingBalance.moneda)} · {formatFecha(data.openingBalance.fecha)}
                {data.openingBalance.moneda !== moneda && <span className="ml-1 text-xs text-tinta-suave">({data.openingBalance.moneda})</span>}
              </span>
              <Button variant="ghost" onClick={() => { setOpeningBalance(null); notify("Saldo inicial quitado; usa ajustes para corregir."); }}>
                Quitar
              </Button>
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_110px_140px_auto]">
              <Input type="number" min="0" step={currencyStep(formSaldo.moneda)} placeholder="Ej. 8000" value={formSaldo.monto} onChange={(e) => setFormSaldo((f) => ({ ...f, monto: e.target.value }))} aria-label="Saldo inicial" />
              <Select value={formSaldo.moneda} onChange={(e) => setFormSaldo((f) => ({ ...f, moneda: e.target.value }))} aria-label="Moneda del saldo inicial">
                {listCurrencies().map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </Select>
              <Input type="date" value={formSaldo.fecha} max={hoyISO()} onChange={(e) => setFormSaldo((f) => ({ ...f, fecha: e.target.value }))} aria-label="Fecha del saldo inicial" />
              <Button variant="accent" onClick={guardarSaldo}><Check size={15} /> Registrar</Button>
            </div>
          )}
          <p className="mt-2 text-xs text-tinta-suave">El saldo inicial es una apertura, no un ingreso ordinario.</p>
        </div>

        <div className="rounded-2xl border border-petroleo/10 p-4">
          <p className="text-sm font-semibold text-petroleo">Ajustes de saldo</p>
          {data.balanceAdjustments.length > 0 && (
            <ul className="mt-3 space-y-2">
              {data.balanceAdjustments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl bg-marfil px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-tinta">{a.descripcion}</p>
                    <p className="text-xs text-tinta-suave">{formatFecha(a.fecha)} · {formatMoney(a.monto, a.moneda)}</p>
                  </div>
                  <button onClick={() => deleteBalanceAdjustment(a.id)} aria-label="Eliminar ajuste" className="rounded-lg p-2 text-tinta-suave hover:bg-coral-50 hover:text-coral-600"><Trash2 size={16} /></button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr_110px_130px_1fr_auto]">
            <Select value={formAjuste.direccion} onChange={(e) => setFormAjuste((f) => ({ ...f, direccion: e.target.value as "entrada" | "salida" }))} aria-label="Dirección del ajuste">
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
            </Select>
            <Input type="number" min="0" step={currencyStep(formAjuste.moneda)} placeholder="Monto" value={formAjuste.monto} onChange={(e) => setFormAjuste((f) => ({ ...f, monto: e.target.value }))} aria-label="Monto del ajuste" />
            <Select value={formAjuste.moneda} onChange={(e) => setFormAjuste((f) => ({ ...f, moneda: e.target.value }))} aria-label="Moneda del ajuste">
              {listCurrencies().map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
            </Select>
            <Input type="date" value={formAjuste.fecha} max={hoyISO()} onChange={(e) => setFormAjuste((f) => ({ ...f, fecha: e.target.value }))} aria-label="Fecha del ajuste" />
            <Input placeholder="Descripción" value={formAjuste.descripcion} onChange={(e) => setFormAjuste((f) => ({ ...f, descripcion: e.target.value }))} aria-label="Descripción del ajuste" />
            <Button variant="outline" onClick={guardarAjuste}><Plus size={15} /> Añadir</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
