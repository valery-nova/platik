"use client";

import { useState } from "react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { usePlatik } from "@/lib/store";
import { hoyISO } from "@/lib/finance";
import { currencyDigits, currencyName, currencyStep, listCurrencies } from "@/lib/currency/catalog";
import { roundToCurrency } from "@/lib/currency/decimal";
import { buildConversionFields } from "@/lib/currency/rates";
import { getRateService } from "@/lib/currency/service";
import type { UserProfileType } from "@/lib/types";

const TIPOS: { id: UserProfileType; nombre: string; detalle: string }[] = [
  { id: "independiente", nombre: "Persona independiente", detalle: "Trabajo por cuenta propia, ingresos variables." },
  { id: "freelancer", nombre: "Freelancer", detalle: "Servicios profesionales, a menudo en varias monedas." },
  { id: "emprendedor", nombre: "Emprendedor/a", detalle: "Negocio propio en crecimiento." },
  { id: "empresa", nombre: "Empresa o pequeño negocio", detalle: "Operación más formal con más categorías." },
];

async function conversionFor(from: string, to: string, amount: number) {
  if (from.toUpperCase() === to.toUpperCase()) return {};
  const { quote } = await getRateService().quote(from, to);
  return buildConversionFields(from, to, amount, quote);
}

export function BetaSetup() {
  const { mode, data, hydrated, updateProfile, setOpeningBalance } = usePlatik();
  const [tipo, setTipo] = useState<UserProfileType | "">(data.profile.tipoUsuario ?? "");
  const [conSaldo, setConSaldo] = useState(data.openingBalance !== null);
  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState(data.profile.moneda);
  const [fecha, setFecha] = useState("");
  const [error, setError] = useState("");
  const [prevMoneda, setPrevMoneda] = useState(data.profile.moneda);
  if (prevMoneda !== data.profile.moneda) {
    setMoneda(data.profile.moneda);
    setPrevMoneda(data.profile.moneda);
  }

  if (!hydrated || mode !== "beta" || data.profile.betaSetupDone || !data.profile.onboardingDone) return null;

  const montoNum = Number(monto);
  const validoSaldo =
    !conSaldo ||
    (Number.isFinite(montoNum) &&
      montoNum > 0 &&
      roundToCurrency(montoNum, currencyDigits(moneda)) > 0  );

  async function guardar(sinSaldo = false) {
    if (!tipo) {
      setError("Elige tu tipo de usuario para personalizar PLATIK.");
      return;
    }
    const usarSaldo = conSaldo && !sinSaldo;
    if (usarSaldo && !validoSaldo) {
      setError("Revisa el saldo inicial: debe ser válido para la moneda elegida.");
      return;
    }
    setError("");
    updateProfile({
      ...data.profile,
      tipoUsuario: tipo,
      betaSetupDone: true,
    });
    if (usarSaldo) {
      const montoGuardado = roundToCurrency(montoNum, currencyDigits(moneda));
      const conversion = await conversionFor(moneda, data.profile.moneda, montoGuardado);
      setOpeningBalance({
        monto: montoGuardado,
        moneda: moneda.toUpperCase(),
        fecha: fecha || hoyISO(),
        descripcion: "Saldo de apertura",
        ...conversion,
      });
    } else {
      setOpeningBalance(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-petroleo/60 p-4 backdrop-blur-sm">
      <Card className="max-h-[90vh] w-full max-w-xl overflow-y-auto p-6">
        <h2 className="text-xl font-bold text-petroleo">Bienvenido/a a PLATIK BETA</h2>
        <p className="mt-1 text-sm text-tinta-suave">
          Configura tu punto de partida. La prueba es de 72 horas; te informaremos el tiempo por separado.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {TIPOS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTipo(t.id)}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                tipo === t.id
                  ? "border-menta-600 bg-menta-50"
                  : "border-petroleo/15 hover:border-menta-600 hover:bg-menta-50"
              }`}
            >
              <span className="block font-semibold text-petroleo">{t.nombre}</span>
              <span className="mt-1 block text-xs text-tinta-suave">{t.detalle}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-petroleo/10 p-4">
          <p className="text-sm font-semibold text-petroleo">¿Tienes dinero disponible ahora?</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setConSaldo(false)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${!conSaldo ? "border-menta-600 bg-menta-100 text-menta-700" : "border-petroleo/15 text-tinta-suave"}`}
            >
              Comenzar sin saldo inicial
            </button>
            <button
              type="button"
              onClick={() => setConSaldo(true)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${conSaldo ? "border-menta-600 bg-menta-100 text-menta-700" : "border-petroleo/15 text-tinta-suave"}`}
            >
              Registrar saldo inicial
            </button>
          </div>
          {conSaldo && (
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px]">
              <Field label="Saldo inicial">
                <Input
                  type="number"
                  min="0"
                  step={currencyStep(moneda)}
                  placeholder="Ej. 8000"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                />
              </Field>
              <Field label="Moneda">
                <Select value={moneda} onChange={(e) => setMoneda(e.target.value)} aria-label="Moneda del saldo inicial">
                  {listCurrencies().map((c) => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Fecha">
                <Input type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} />
              </Field>
              <p className="self-end text-xs text-tinta-suave sm:col-span-2">
                Se registra como saldo de apertura, no como ingreso. Moneda principal: {currencyName(data.profile.moneda)}.
              </p>
            </div>
          )}
        </div>

        {error && <p className="mt-3 rounded-xl bg-coral-50 px-3.5 py-2.5 text-sm text-coral-600">{error}</p>}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => guardar(true)} disabled={!tipo}>
            Continuar sin saldo
          </Button>
          <Button variant="accent" onClick={() => guardar(false)} disabled={!tipo || (conSaldo && !validoSaldo)}>
            Comenzar
          </Button>
        </div>
      </Card>
    </div>
  );
}
