"use client";

import { useState } from "react";
import { Check, RefreshCcw } from "lucide-react";
import { Button, Card, CardHeader, DemoBadge, Field, Input, PageHeader, Select } from "@/components/ui";
import { SaldoDisponibleCard } from "@/components/saldo-disponible";
import { DistribucionEditor } from "@/components/distribucion-editor";
import { FeedbackLink } from "@/components/feedback";
import { SpacesCard } from "@/components/spaces-card";
import { usePlatik } from "@/lib/store";
import { formatMoney } from "@/lib/format";
import { countryName, listCountries, listCurrencies } from "@/lib/currency/catalog";
import type { Profile } from "@/lib/types";

function PerfilForm() {
  const { data, updateProfile } = usePlatik();
  const [draft, setDraft] = useState<Profile>({ ...data.profile });
  const [saved, setSaved] = useState(false);
  const [prev, setPrev] = useState(data.profile);
  if (prev !== data.profile) {
    setDraft({ ...data.profile });
    setPrev(data.profile);
  }

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function guardar() {
    updateProfile({
      ...draft,
      nombreNegocio: draft.nombreNegocio.trim(),
      nombreUsuario: draft.nombreUsuario.trim(),
      moneda: draft.moneda.toUpperCase(),
      displayCurrency: draft.displayCurrency ? draft.displayCurrency.toUpperCase() : undefined,
      countryCode: draft.countryCode || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <Card className="p-6">
      <CardHeader title="Datos del espacio" subtitle="Nombre, moneda y país del espacio activo" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Nombre del negocio" hint="Cómo se identifica tu negocio en reportes">
          <Input value={draft.nombreNegocio} onChange={(e) => set("nombreNegocio", e.target.value)} placeholder="Ej. Artesanías La Chamba" />
        </Field>
        <Field label="Tu nombre">
          <Input value={draft.nombreUsuario} onChange={(e) => set("nombreUsuario", e.target.value)} placeholder="Ej. Valeria" />
        </Field>
        <Field label="País">
          <Select value={draft.countryCode ?? ""} onChange={(e) => set("countryCode", e.target.value)}>
            <option value="">— Sin especificar —</option>
            {listCountries().map((c) => <option key={c.code} value={c.code}>{countryName(c.code)} ({c.code})</option>)}
          </Select>
        </Field>
        <Field label="Moneda principal" hint="Moneda en la que registras y analizas">
          <Select value={draft.moneda} onChange={(e) => set("moneda", e.target.value)}>
            {listCurrencies().map((c) => <option key={c.code} value={c.code}>{countryName(c.code)} ({c.code})</option>)}
          </Select>
        </Field>
        <Field label="Moneda de visualización" hint="Opcional: ver equivalencias en otra moneda">
          <Select value={draft.displayCurrency ?? ""} onChange={(e) => set("displayCurrency", e.target.value)}>
            <option value="">— No mostrar —</option>
            {listCurrencies().map((c) => <option key={c.code} value={c.code}>{countryName(c.code)} ({c.code})</option>)}
          </Select>
        </Field>
      </div>
      {saved && <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-menta-100 px-3.5 py-2.5 text-sm font-medium text-menta-700"><Check size={15} /> Perfil actualizado</p>}
      <div className="mt-4 flex justify-end">
        <Button variant="accent" onClick={guardar}><Check size={15} /> Guardar perfil</Button>
      </div>
    </Card>
  );
}

export default function PerfilPage() {
  const { data, mode, hydrated, switchMode, resetCurrent } = usePlatik();
  if (!hydrated) return <PageHeader title="Perfil" subtitle="Cargando…" />;

  const esDemo = mode === "demo";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perfil y configuración"
        subtitle={esDemo ? "Estás explorando con datos de ejemplo" : "Prueba beta · 72 horas"}
        action={<DemoBadge />}
      />

      {esDemo ? (
        <div className="rounded-2xl border border-menta-600/30 bg-menta-50 px-4 py-3 text-sm text-petroleo">
          Estás en <strong>modo demostración</strong>: los datos de ejemplo nunca se modifican de forma permanente.
          Tus cambios viven en una copia independiente que puedes restablecer.
        </div>
      ) : (
        <div className="rounded-2xl border border-lavanda/30 bg-lavanda-50 px-4 py-3 text-sm text-petroleo">
          Estás en <strong>prueba beta</strong> (72 horas). Los datos se guardan solo en este navegador.
        </div>
      )}

      <SpacesCard />
      <SaldoDisponibleCard />
      <DistribucionEditor />
      <PerfilForm />

      <Card className="p-6">
        <CardHeader title="Datos y modalidad" subtitle="Espacios independientes por modalidad" />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant={esDemo ? "accent" : "outline"} onClick={() => switchMode("demo")}>
            Explorar con datos de ejemplo
          </Button>
          <Button variant={esDemo ? "outline" : "accent"} onClick={() => switchMode("beta")}>
            Comenzar desde cero
          </Button>
          <Button variant="ghost" onClick={() => { resetCurrent(); }}>
            <RefreshCcw size={15} /> Restablecer {esDemo ? "demo" : "beta"}
          </Button>
          <FeedbackLink />
        </div>
        <p className="mt-3 text-xs text-tinta-suave">
          Moneda principal actual: {data.profile.moneda} · {formatMoney(0, data.profile.moneda)} = cero.
          Los datos de cada modalidad no se mezclan.
        </p>
      </Card>
    </div>
  );
}
