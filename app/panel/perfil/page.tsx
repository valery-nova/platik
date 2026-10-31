"use client";

import { useState } from "react";
import { Check, RefreshCcw, SlidersHorizontal } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  DemoBadge,
  Field,
  Input,
  PanelSkeleton,
  ProgressBar,
  Select,
} from "@/components/ui";
import { usePlatik } from "@/lib/store";
import { buildDemoData } from "@/lib/demo-data";
import { formatMoney } from "@/lib/format";
import type { Currency } from "@/lib/types";
import { excedenteEstimado, haceDiasISO, txInRange } from "@/lib/finance";

export default function PerfilPage() {
  const {
    data,
    hydrated,
    updateProfile,
    updateDistribution,
    resetDemo,
  } = usePlatik();

  const [form, setForm] = useState(data.profile);
  const [dist, setDist] = useState(data.distribution);
  const [aviso, setAviso] = useState("");
  const [sincronizado, setSincronizado] = useState(false);

  // Ajuste de estado durante el render: una vez hidratados los datos,
  // copiamos el perfil guardado a los formularios una sola vez.
  if (hydrated && !sincronizado) {
    setForm(data.profile);
    setDist(data.distribution);
    setSincronizado(true);
  }

  if (!hydrated) return <PanelSkeleton />;

  const sumaDist = dist.operacion + dist.reinversion + dist.ahorro;
  const excedente = excedenteEstimado(txInRange(data.transactions, haceDiasISO(29)));

  function notify(msg: string) {
    setAviso(msg);
    setTimeout(() => setAviso(""), 3000);
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-petroleo sm:text-3xl">
            Perfil y configuración
          </h1>
          <p className="mt-1 text-sm text-tinta-suave">
            Personaliza tu espacio de trabajo.
          </p>
        </div>
        <DemoBadge />
      </div>

      {aviso && (
        <p className="anim-fade-up rounded-xl bg-menta-100 px-4 py-3 text-sm font-medium text-menta-700">
          {aviso}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Datos del negocio */}
        <Card className="p-6">
          <CardHeader
            title="Tu negocio"
            subtitle="Se guarda en este navegador"
          />
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              updateProfile({ ...form, nombreNegocio: form.nombreNegocio.trim(), nombreUsuario: form.nombreUsuario.trim() });
              notify("Perfil guardado.");
            }}
          >
            <Field label="Nombre del negocio">
              <Input
                value={form.nombreNegocio}
                maxLength={60}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nombreNegocio: e.target.value }))
                }
                required
              />
            </Field>
            <Field label="Tu nombre">
              <Input
                value={form.nombreUsuario}
                maxLength={40}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nombreUsuario: e.target.value }))
                }
                required
              />
            </Field>
            <Field
              label="Moneda principal"
              hint="Los montos registrados se muestran en esta moneda, sin conversión. USD y USDC llegarán con soporte de tipo de cambio en fases posteriores."
            >
              <Select
                value={form.moneda}
                onChange={(e) =>
                  setForm((f) => ({ ...f, moneda: e.target.value as Currency }))
                }
              >
                <option value="BOB">Bolivianos (BOB)</option>
              </Select>
            </Field>
            <div className="flex justify-end">
              <Button type="submit" variant="accent">
                <Check size={15} /> Guardar perfil
              </Button>
            </div>
          </form>
        </Card>

        {/* Distribución del dinero */}
        <Card className="p-6">
          <CardHeader
            title="Distribución sugerida"
            subtitle="Cómo repartir tu ganancia estimada — es una propuesta editable, no una regla"
          />
          <div className="space-y-4">
            {(
              [
                ["operacion", "Operación", "cubrir costos y gastos del negocio"],
                ["reinversion", "Reinversión", "crecer: inventario, marketing, mejoras"],
                ["ahorro", "Ahorro", "metas y fondo de emergencia"],
              ] as const
            ).map(([key, label, hint]) => (
              <Field key={key} label={label} hint={hint}>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={dist[key]}
                    onChange={(e) =>
                      setDist((d) => ({ ...d, [key]: Number(e.target.value) }))
                    }
                    className="w-24"
                  />
                  <span className="text-sm text-tinta-suave">%</span>
                  <span className="ml-auto text-sm font-medium text-petroleo">
                    ≈ {formatMoney((excedente * dist[key]) / 100, data.profile.moneda)}
                  </span>
                </div>
              </Field>
            ))}
            <div>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="text-tinta-suave">Total repartido</span>
                <span
                  className={`font-semibold ${sumaDist === 100 ? "text-menta-700" : "text-coral-600"}`}
                >
                  {sumaDist}%
                </span>
              </div>
              <ProgressBar
                value={sumaDist}
                tone={sumaDist === 100 ? "menta" : "coral"}
              />
              {sumaDist !== 100 && (
                <p className="mt-1.5 text-xs text-coral-600">
                  Los porcentajes deben sumar 100% para guardar.
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <Button
                variant="accent"
                disabled={sumaDist !== 100}
                onClick={() => {
                  updateDistribution(dist);
                  notify("Distribución actualizada.");
                }}
              >
                <Check size={15} /> Guardar distribución
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Datos y demostración */}
      <Card className="p-6">
        <CardHeader title="Tus datos" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <SlidersHorizontal size={20} className="mt-0.5 shrink-0 text-lavanda-600" />
            <p className="text-sm text-tinta-suave">
              Los datos actuales son de <strong>demostración</strong> y se guardan
              solo en este navegador (localStorage). No hay cuentas ni servidor
              todavía — la autenticación y Supabase llegan en la fase 2.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              resetDemo();
              const demo = buildDemoData();
              setForm(demo.profile);
              setDist(demo.distribution);
              notify("Datos de demostración restablecidos.");
            }}
          >
            <RefreshCcw size={15} /> Restablecer demo
          </Button>
        </div>
      </Card>
    </div>
  );
}
