"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DemoBadge,
  EmptyState,
  Field,
  Input,
  Modal,
  PanelSkeleton,
  Select,
} from "@/components/ui";
import { usePlatik } from "@/lib/store";
import { CATEGORIAS } from "@/lib/categories";
import { hoyISO } from "@/lib/finance";
import { formatFecha, formatMoney } from "@/lib/format";
import type { Transaction, TxType } from "@/lib/types";

const TIPO_LABEL: Record<TxType, string> = {
  ingreso: "Ingreso",
  gasto: "Gasto",
  costo: "Costo",
};

interface FormState {
  tipo: TxType;
  monto: string;
  categoria: string;
  descripcion: string;
  fecha: string;
}

const FORM_INICIAL: FormState = {
  tipo: "ingreso",
  monto: "",
  categoria: CATEGORIAS.ingreso[0],
  descripcion: "",
  fecha: "",
};

function TransactionForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: FormState;
  submitLabel: string;
  onSubmit: (f: FormState) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState("");

  const montoNum = Number(form.monto);
  const valido =
    Number.isFinite(montoNum) &&
    montoNum > 0 &&
    form.descripcion.trim().length >= 2 &&
    Boolean(form.fecha);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valido) {
      setError(
        "Revisa los datos: el monto debe ser mayor a 0 y la descripción no puede estar vacía.",
      );
      return;
    }
    onSubmit(form);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Tipo de movimiento">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(TIPO_LABEL) as TxType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() =>
                setForm((f) => ({ ...f, tipo: t, categoria: CATEGORIAS[t][0] }))
              }
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                form.tipo === t
                  ? t === "ingreso"
                    ? "border-menta-600 bg-menta-100 text-menta-700"
                    : "border-coral-600 bg-coral-100 text-coral-600"
                  : "border-petroleo/15 text-tinta-suave hover:border-petroleo/40"
              }`}
            >
              {TIPO_LABEL[t]}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Monto (Bs)">
        <Input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="0.00"
          value={form.monto}
          onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
          required
        />
      </Field>
      <Field label="Descripción">
        <Input
          placeholder="Ej. Ventas del fin de semana"
          value={form.descripcion}
          onChange={(e) =>
            setForm((f) => ({ ...f, descripcion: e.target.value }))
          }
          required
          maxLength={80}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoría">
          <Select
            value={form.categoria}
            onChange={(e) =>
              setForm((f) => ({ ...f, categoria: e.target.value }))
            }
          >
            {CATEGORIAS[form.tipo].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha">
          <Input
            type="date"
            value={form.fecha}
            max={hoyISO()}
            onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
            required
          />
        </Field>
      </div>
      {error && (
        <p className="rounded-xl bg-coral-50 px-3.5 py-2.5 text-sm text-coral-600">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="accent">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default function TransaccionesPage() {
  const {
    data,
    hydrated,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = usePlatik();
  const moneda = data.profile.moneda;

  const [filtroTipo, setFiltroTipo] = useState<"todos" | TxType>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [modal, setModal] = useState<"nueva" | Transaction | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Transaction | null>(null);
  const [aviso, setAviso] = useState("");

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return [...data.transactions]
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .filter((t) => filtroTipo === "todos" || t.tipo === filtroTipo)
      .filter((t) => filtroCategoria === "todas" || t.categoria === filtroCategoria)
      .filter(
        (t) =>
          !q ||
          t.descripcion.toLowerCase().includes(q) ||
          t.categoria.toLowerCase().includes(q),
      );
  }, [data.transactions, filtroTipo, filtroCategoria, busqueda]);

  const categoriasVisibles = useMemo(
    () => [...new Set(data.transactions.map((t) => t.categoria))].sort(),
    [data.transactions],
  );

  function notify(msg: string) {
    setAviso(msg);
    setTimeout(() => setAviso(""), 3000);
  }

  if (!hydrated) return <PanelSkeleton />;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-petroleo sm:text-3xl">
            Transacciones
          </h1>
          <p className="mt-1 text-sm text-tinta-suave">
            Registra y revisa tus ingresos, costos y gastos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DemoBadge />
          <Button variant="accent" onClick={() => setModal("nueva")}>
            <Plus size={16} /> Nueva transacción
          </Button>
        </div>
      </div>

      {aviso && (
        <p className="anim-fade-up rounded-xl bg-menta-100 px-4 py-3 text-sm font-medium text-menta-700">
          {aviso}
        </p>
      )}

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-suave"
            />
            <Input
              className="pl-9"
              placeholder="Buscar por descripción o categoría…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar transacciones"
            />
          </div>
          <Select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as "todos" | TxType)}
            aria-label="Filtrar por tipo"
          >
            <option value="todos">Todos los tipos</option>
            <option value="ingreso">Ingresos</option>
            <option value="costo">Costos</option>
            <option value="gasto">Gastos</option>
          </Select>
          <Select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            aria-label="Filtrar por categoría"
          >
            <option value="todas">Todas las categorías</option>
            {categoriasVisibles.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Lista */}
      <Card className="overflow-hidden">
        {visibles.length === 0 ? (
          <EmptyState
            title="Sin resultados"
            description="No hay transacciones que coincidan con los filtros. Prueba con otra búsqueda o registra una nueva."
            mascot="analiza"
            action={
              <Button variant="accent" onClick={() => setModal("nueva")}>
                <Plus size={16} /> Nueva transacción
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-petroleo/6">
            {visibles.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-marfil sm:px-5"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    t.tipo === "ingreso"
                      ? "bg-menta-100 text-menta-700"
                      : "bg-coral-100 text-coral-600"
                  }`}
                >
                  {t.tipo === "ingreso" ? (
                    <ArrowUpRight size={18} />
                  ) : (
                    <ArrowDownRight size={18} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-tinta">
                    {t.descripcion}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-tinta-suave">
                    <span>{t.categoria}</span>·<span>{formatFecha(t.fecha)}</span>
                    <Badge tone={t.tipo === "ingreso" ? "menta" : "coral"}>
                      {TIPO_LABEL[t.tipo]}
                    </Badge>
                  </p>
                </div>
                <p
                  className={`shrink-0 text-sm font-semibold sm:text-base ${
                    t.tipo === "ingreso" ? "text-menta-700" : "text-coral-600"
                  }`}
                >
                  {t.tipo === "ingreso" ? "+" : "−"}
                  {formatMoney(t.monto, moneda)}
                </p>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setModal(t)}
                    aria-label={`Editar ${t.descripcion}`}
                    className="rounded-lg p-2 text-tinta-suave hover:bg-petroleo-50 hover:text-petroleo"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(t)}
                    aria-label={`Eliminar ${t.descripcion}`}
                    className="rounded-lg p-2 text-tinta-suave hover:bg-coral-50 hover:text-coral-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-center text-xs text-tinta-suave">
        {visibles.length} movimiento{visibles.length === 1 ? "" : "s"} · los datos
        se guardan en este navegador
      </p>

      {/* Modal nueva / editar */}
      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === "nueva" ? "Nueva transacción" : "Editar transacción"}
      >
        {modal !== null && (
          <TransactionForm
            key={modal === "nueva" ? "nueva" : modal.id}
            initial={
              modal === "nueva"
                ? { ...FORM_INICIAL, fecha: hoyISO() }
                : {
                    tipo: modal.tipo,
                    monto: String(modal.monto),
                    categoria: modal.categoria,
                    descripcion: modal.descripcion,
                    fecha: modal.fecha,
                  }
            }
            submitLabel={modal === "nueva" ? "Guardar" : "Actualizar"}
            onCancel={() => setModal(null)}
            onSubmit={(f) => {
              const tx = {
                tipo: f.tipo,
                monto: Number(f.monto),
                categoria: f.categoria,
                descripcion: f.descripcion.trim(),
                fecha: f.fecha,
              };
              if (modal === "nueva") {
                addTransaction(tx);
                notify("Transacción registrada correctamente.");
              } else {
                updateTransaction({ ...tx, id: modal.id });
                notify("Transacción actualizada.");
              }
              setModal(null);
            }}
          />
        )}
      </Modal>

      {/* Confirmar eliminación */}
      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar transacción"
      >
        {confirmDelete && (
          <div className="space-y-4">
            <p className="text-sm text-tinta-suave">
              ¿Eliminar <strong>“{confirmDelete.descripcion}”</strong> por{" "}
              {formatMoney(confirmDelete.monto, moneda)}? Esta acción no se puede
              deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  deleteTransaction(confirmDelete.id);
                  setConfirmDelete(null);
                  notify("Transacción eliminada.");
                }}
              >
                <Trash2 size={15} /> Eliminar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
