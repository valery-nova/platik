"use client";

import { useMemo, useState } from "react";
import { Check, Plus, RefreshCcw, Sparkles, Trash2 } from "lucide-react";
import { Button, Card, CardHeader, Field, Input, Modal, ProgressBar, Select } from "@/components/ui";
import { usePlatik } from "@/lib/store";
import { saldoDisponible } from "@/lib/balance";
import { buildDemoData } from "@/lib/demo-data";
import { formatMoney } from "@/lib/format";
import { currencyDigits } from "@/lib/currency/catalog";
import {
  DISTRIBUTION_CATALOG,
  defaultDistributionForProfile,
  montosDistribucion,
  pctDe,
  sugerirDistribucion,
  validarDistribucion,
  type PropuestaDistribucion,
} from "@/lib/distribution";
import type { DistributionCategory } from "@/lib/types";

export function DistribucionEditor() {
  const { data, hydrated, updateDistribution, mode, activeSpaceType } = usePlatik();
  const moneda = data.profile.moneda;
  const [dist, setDist] = useState<DistributionCategory[]>(data.distribution);
  const [aviso, setAviso] = useState("");
  const [propuesta, setPropuesta] = useState<PropuestaDistribucion | null>(null);
  const [categoriaNueva, setCategoriaNueva] = useState("");
  const [prev, setPrev] = useState(data.distribution);
  const [montoTexto, setMontoTexto] = useState<Record<string, string>>({});
  if (prev !== data.distribution) {
    setDist(data.distribution);
    setPrev(data.distribution);
    setMontoTexto({});
  }

  const saldo = useMemo(() => saldoDisponible(data, moneda), [data, moneda]);
  const disponible = saldo.monto !== null && saldo.monto > 0 ? saldo.monto : null;
  const validacion = validarDistribucion(dist);
  const montos = disponible !== null ? montosDistribucion(dist, disponible, moneda) : null;
  const paso = 1 / 10 ** currencyDigits(moneda);

  if (!hydrated) return null;

  function notify(msg: string) {
    setAviso(msg);
    setTimeout(() => setAviso(""), 3000);
  }

  function setPct(key: string, value: string) {
    const n = Number(value);
    setDist((d) => d.map((c) => (c.key === key ? { ...c, porcentaje: Number.isFinite(n) ? n : 0 } : c)));
  }

  function setMonto(key: string, value: string) {
    const n = Number(value);
    setMontoTexto((m) => ({ ...m, [key]: value }));
    if (disponible === null || !Number.isFinite(n)) return;
    const pct = pctDe(currencyDigits(moneda))(Math.min(Math.max(n, 0), disponible), disponible);
    setDist((d) => d.map((c) => (c.key === key ? { ...c, porcentaje: pct } : c)));
  }

  function terminarMonto(key: string) {
    setMontoTexto((m) => {
      const next = { ...m };
      delete next[key];
      return next;
    });
  }

  function agregarCategoria() {
    if (!categoriaNueva || dist.some((c) => c.key === categoriaNueva)) return;
    const def = DISTRIBUTION_CATALOG.find((c) => c.key === categoriaNueva);
    if (!def) return;
    setDist((d) => [...d, { key: def.key, nombre: def.nombre, descripcion: def.descripcion, porcentaje: 0 }]);
    setCategoriaNueva("");
  }

  function quitarCategoria(key: string) {
    setDist((d) => d.filter((c) => c.key !== key));
  }

  function restablecer() {
    setDist(
      activeSpaceType === "personal" && mode === "demo"
        ? buildDemoData().distribution
        : defaultDistributionForProfile(data.profile.tipoUsuario),
    );
    notify("Distribución restablecida a los valores iniciales.");
  }

  function recomendar() {
    setPropuesta(sugerirDistribucion({ tipoUsuario: data.profile.tipoUsuario, disponible: saldo.monto, moneda }));
  }

  const disponiblesParaAgregar = DISTRIBUTION_CATALOG.filter((c) => !dist.some((d) => d.key === c.key));

  return (
    <Card className="p-6">
      <CardHeader
        title="Distribución del dinero disponible"
        subtitle="Puedes escribir el porcentaje o el monto; ambos se mantienen sincronizados."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={recomendar}><Sparkles size={15} /> Recomendar</Button>
            <Button variant="outline" onClick={restablecer}><RefreshCcw size={15} /> Restablecer</Button>
          </div>
        }
      />
      {aviso && <p className="mb-3 rounded-xl bg-menta-100 px-4 py-2.5 text-sm font-medium text-menta-700">{aviso}</p>}

      <div className="mb-4 rounded-xl bg-menta-50 px-4 py-3 text-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-tinta-suave">Dinero disponible para distribuir</span>
          <span className="text-lg font-bold text-petroleo">{disponible === null ? "No determinable" : formatMoney(disponible, moneda)}</span>
        </div>
        <p className="mt-1 text-xs text-tinta-suave">{saldo.motivo} No es tu saldo bancario ni tus ingresos brutos.</p>
      </div>

      {disponible === null && (
        <div className="mb-4 rounded-xl border border-coral-600/30 bg-coral-50 px-4 py-3 text-sm text-tinta">
          <p className="font-semibold text-coral-600">Los montos no están disponibles todavía.</p>
          <p className="mt-1 text-tinta-suave">
            PLATIK calcula el dinero disponible con tu saldo inicial, ajustes y movimientos en {moneda}. Puedes seguir editando los <strong>porcentajes</strong>; cuando el disponible sea determinable, los montos aparecerán aquí.
            {saldo.estado === "incompleto" && " Hay ingresos o gastos en otra moneda sin cotización."}
          </p>
        </div>
      )}
      {disponible !== null && (
        <p className="mb-4 text-xs text-tinta-suave">
          Al escribir un monto, PLATIK lo convierte a porcentaje sobre {formatMoney(disponible, moneda)}. Si cambias un porcentaje, el monto se recalcula solo. Ambos se guardan juntos.
        </p>
      )}

      <div className="space-y-4">
        {dist.map((c, catIndex) => {
          const importe = montos?.porCategoria[c.key] ?? null;
          return (
            <Field key={c.key} label={c.nombre} labelId={`dist-cat-${catIndex}`} hint={c.descripcion || "Categoría personalizada"}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span id={`dist-pct-${catIndex}`} className="sr-only">Porcentaje</span>
                  <Input type="number" min={0} max={100} step={0.001} aria-labelledby={`dist-pct-${catIndex} dist-cat-${catIndex}`} value={c.porcentaje} onChange={(e) => setPct(c.key, e.target.value)} className="w-24" />
                  <span aria-hidden="true" className="text-sm text-tinta-suave">%</span>
                </div>
                {montos && disponible !== null ? (
                  <div className="flex items-center gap-1.5">
                    <span id={`dist-amount-${catIndex}`} className="sr-only">Monto</span>
                    <Input
                      type="number"
                      min={0}
                      max={disponible}
                      step={paso}
                      aria-labelledby={`dist-amount-${catIndex} dist-cat-${catIndex}`}
                      value={montoTexto[c.key] ?? importe ?? 0}
                      onChange={(e) => setMonto(c.key, e.target.value)}
                      onBlur={() => terminarMonto(c.key)}
                      className="w-36"
                    />
                    <span aria-hidden="true" className="text-sm text-tinta-suave">{moneda}</span>
                  </div>
                ) : null}
                <span id={`dist-remove-${catIndex}`} className="sr-only">Quitar categoría</span>
                <button onClick={() => quitarCategoria(c.key)} aria-labelledby={`dist-remove-${catIndex} dist-cat-${catIndex}`} className="rounded-lg p-2 text-tinta-suave hover:bg-coral-50 hover:text-coral-600"><Trash2 size={16} /></button>
              </div>
            </Field>
          );
        })}

        {dist.length === 0 && (
          <p className="rounded-xl bg-lavanda-50 px-4 py-3 text-sm text-lavanda-600">No hay categorías activas. Agrega una o restablece la distribución.</p>
        )}

        {disponiblesParaAgregar.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={categoriaNueva} onChange={(e) => setCategoriaNueva(e.target.value)} aria-label="Agregar categoría" className="w-64">
              <option value="">Agregar categoría…</option>
              {disponiblesParaAgregar.map((c) => <option key={c.key} value={c.key}>{c.nombre}</option>)}
            </Select>
            <Button variant="outline" onClick={agregarCategoria} disabled={!categoriaNueva}><Plus size={15} /> Agregar</Button>
          </div>
        )}

        <div>
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-tinta-suave">Total asignado</span>
            <span className={`font-semibold ${validacion.valida ? "text-menta-700" : "text-coral-600"}`}>
              {Math.round(validacion.total * 10) / 10}%{disponible !== null && montos ? ` · ${formatMoney(disponible - montos.sinAsignar, moneda)}` : ""}
            </span>
          </div>
          <ProgressBar value={Math.min(100, validacion.total)} tone={validacion.valida ? "menta" : "coral"} />
          {validacion.errores.map((e) => <p key={e} className="mt-1.5 text-xs text-coral-600">{e}</p>)}
          {validacion.valida && validacion.sinAsignar > 0 && (
            <p className="mt-1.5 text-xs text-tinta-suave">
              Queda {validacion.sinAsignar}% sin asignar{montos ? ` (${formatMoney(montos.sinAsignar, moneda)})` : ""}: puedes dejarlo libre o repartirlo.
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="ghost" onClick={restablecer}><RefreshCcw size={15} /> Restablecer</Button>
          <Button variant="accent" disabled={!validacion.valida} onClick={() => { updateDistribution(dist); notify("Distribución actualizada."); }}>
            <Check size={15} /> Guardar distribución
          </Button>
        </div>
      </div>

      <Modal open={propuesta !== null} onClose={() => setPropuesta(null)} title="Distribución recomendada">
        {propuesta && (
          <div className="space-y-4">
            <ul className="space-y-1.5 text-sm text-tinta-suave">
              {propuesta.explicacion.map((e) => <li key={e}>• {e}</li>)}
            </ul>
            <div className="space-y-2">
              {propuesta.items.map((c) => (
                <div key={c.key} className="flex items-center justify-between rounded-xl bg-marfil px-3 py-2 text-sm">
                  <span className="font-medium text-tinta">{c.nombre}</span>
                  <span className="text-tinta-suave">
                    {c.porcentaje}% · {propuesta.montos ? formatMoney(propuesta.montos.porCategoria[c.key] ?? 0, moneda) : "—"}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setPropuesta(null)}>Rechazar</Button>
              <Button variant="outline" onClick={() => { setPropuesta(sugerirDistribucion({ tipoUsuario: data.profile.tipoUsuario, disponible: saldo.monto, moneda })); }}>Recalcular</Button>
              <Button variant="outline" onClick={() => { setDist(propuesta.items); setPropuesta(null); notify("Propuesta cargada: revísala y guarda si te convence."); }}>Modificar</Button>
              <Button variant="accent" onClick={() => { setDist(propuesta.items); updateDistribution(propuesta.items); setPropuesta(null); notify("Distribución recomendada aplicada."); }}>
                <Check size={15} /> Aceptar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}
