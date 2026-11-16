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
import {
  countryName,
  currencyDigits,
  currencyName,
  listCountries,
  listCurrencies,
  suggestedCurrenciesForCountry,
} from "@/lib/currency/catalog";
import { haceDiasISO, hoyISO } from "@/lib/finance";
import {
  CATEGORIAS_DISTRIBUCION,
  dineroDisponible,
  montosDistribucion,
  porcentajeDesdeMonto,
  resumenPeriodo,
  validarDistribucion,
  type CategoriaDistribucion,
} from "@/lib/insights";

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

  // Ajuste de estado durante el render: cuando el perfil o la distribución
  // guardados cambian (hidratación, onboarding completado, restablecer
  // demo), los formularios se resincronizan. Sin esto, un guardado
  // posterior podría revertir una configuración recién hecha.
  const [prev, setPrev] = useState({ profile: data.profile, distribution: data.distribution });
  if (prev.profile !== data.profile || prev.distribution !== data.distribution) {
    // Solo se resincroniza el formulario cuya fuente cambió: guardar el
    // perfil no debe borrar porcentajes de distribución aún sin guardar.
    if (prev.profile !== data.profile) setForm(data.profile);
    if (prev.distribution !== data.distribution) setDist(data.distribution);
    setPrev({ profile: data.profile, distribution: data.distribution });
  }

  if (!hydrated) return <PanelSkeleton />;

  const monedaPrincipal = data.profile.moneda;
  // La distribución se calcula sobre el dinero disponible (excedente de los
  // últimos 30 días), nunca sobre los ingresos brutos. La vista previa usa
  // los porcentajes en edición (dist), no los guardados.
  const disponible = dineroDisponible(
    resumenPeriodo(data.transactions, monedaPrincipal, haceDiasISO(29), hoyISO()),
  );
  const validacion = validarDistribucion(dist);
  const montos =
    disponible.monto !== null
      ? montosDistribucion(dist, disponible.monto, monedaPrincipal)
      : null;
  const paso = 1 / 10 ** currencyDigits(monedaPrincipal);

  function editarMonto(key: CategoriaDistribucion, valor: string) {
    if (disponible.monto === null || disponible.monto <= 0) return;
    const monto = Number(valor);
    // Un importe mayor que el disponible se limita al disponible.
    const pct = porcentajeDesdeMonto(
      Math.min(Number.isFinite(monto) ? monto : 0, disponible.monto),
      disponible.monto,
    );
    if (pct !== null) setDist((d) => ({ ...d, [key]: pct }));
  }

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
            <Field label="País" hint="Opcional: sugiere la moneda local, sin limitarte a ella.">
              <Select
                value={form.countryCode ?? ""}
                onChange={(e) => {
                  const code = e.target.value;
                  setForm((f) => {
                    const next = { ...f, countryCode: code || undefined };
                    if (code && !f.currencyPreference) {
                      const suggested = suggestedCurrenciesForCountry(code)[0];
                      if (suggested) next.moneda = suggested;
                    }
                    return next;
                  });
                }}
              >
                <option value="">Sin especificar</option>
                {listCountries().map((c) => (
                  <option key={c.code} value={c.code}>
                    {countryName(c.code)} ({c.code})
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Moneda principal"
                hint="Todos los cálculos se hacen en esta moneda. Puedes cambiarla cuando quieras."
              >
                <Select
                  value={form.moneda}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      moneda: e.target.value,
                      currencyPreference: "custom",
                    }))
                  }
                >
                  {listCurrencies().map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} · {currencyName(c.code)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Moneda de visualización"
                hint="Opcional: muestra equivalencias informativas (≈) con cotización de referencia. Nunca altera tus valores reales."
              >
                <Select
                  value={form.displayCurrency ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      displayCurrency: e.target.value || undefined,
                    }))
                  }
                >
                  <option value="">Igual que la principal</option>
                  {listCurrencies()
                    .filter((c) => c.code !== form.moneda)
                    .map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} · {currencyName(c.code)}
                      </option>
                    ))}
                </Select>
              </Field>
            </div>
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
            title="Distribución del dinero disponible"
            subtitle="Tú decides cómo repartir el excedente: los porcentajes son tuyos, no una recomendación universal"
          />
          <div className="mb-4 rounded-xl bg-menta-50 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-tinta-suave">Dinero disponible (30 días)</span>
              <span className="text-lg font-bold text-petroleo">
                {disponible.monto === null
                  ? "No determinable"
                  : formatMoney(disponible.monto, monedaPrincipal)}
              </span>
            </div>
            <p className="mt-1 text-xs text-tinta-suave">
              {disponible.motivo} No es tu saldo bancario ni tus ingresos brutos.
            </p>
          </div>
          <div className="space-y-4">
            {CATEGORIAS_DISTRIBUCION.map(({ key, nombre, descripcion }) => (
              <Field key={key} label={nombre} hint={descripcion}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      aria-label={`${nombre} en porcentaje`}
                      value={dist[key]}
                      onChange={(e) =>
                        setDist((d) => ({ ...d, [key]: Number(e.target.value) }))
                      }
                      className="w-24"
                    />
                    <span className="text-sm text-tinta-suave">%</span>
                  </div>
                  {montos && disponible.monto !== null && disponible.monto > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        max={disponible.monto}
                        step={paso}
                        aria-label={`${nombre} en ${monedaPrincipal}`}
                        value={montos[key]}
                        onChange={(e) => editarMonto(key, e.target.value)}
                        className="w-36"
                      />
                      <span className="text-sm text-tinta-suave">{monedaPrincipal}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-tinta-suave">
                      Sin importe: no hay dinero disponible que repartir.
                    </span>
                  )}
                </div>
              </Field>
            ))}
            <div>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="text-tinta-suave">Total asignado</span>
                <span
                  className={`font-semibold ${validacion.valida ? "text-menta-700" : "text-coral-600"}`}
                >
                  {validacion.total}%
                </span>
              </div>
              <ProgressBar
                value={Math.min(100, validacion.total)}
                tone={validacion.valida ? "menta" : "coral"}
              />
              {validacion.errores.map((e) => (
                <p key={e} className="mt-1.5 text-xs text-coral-600">
                  {e}
                </p>
              ))}
              {validacion.valida && validacion.sinAsignar > 0 && (
                <p className="mt-1.5 text-xs text-tinta-suave">
                  Queda {validacion.sinAsignar}% sin asignar
                  {montos ? ` (${formatMoney(montos.sinAsignar, monedaPrincipal)})` : ""}: puedes
                  dejarlo libre o repartirlo.
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <Button
                variant="accent"
                disabled={!validacion.valida}
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
