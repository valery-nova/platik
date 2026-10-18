"use client";

import { useState } from "react";
import { Coins, Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";
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
  ProgressBar,
} from "@/components/ui";
import { usePlatik } from "@/lib/store";
import { formatFecha, formatMoney, formatPct } from "@/lib/format";
import type { Goal } from "@/lib/types";

interface GoalFormState {
  nombre: string;
  montoObjetivo: string;
  fechaObjetivo: string;
}

function GoalForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: GoalFormState;
  submitLabel: string;
  onSubmit: (f: GoalFormState) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");

  const monto = Number(form.montoObjetivo);
  const valido = Number.isFinite(monto) && monto > 0 && form.nombre.trim().length >= 2;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valido) {
          setError("Ponle un nombre a tu meta y un monto objetivo mayor a 0.");
          return;
        }
        onSubmit(form);
      }}
    >
      <Field label="Nombre de la meta">
        <Input
          placeholder="Ej. Fondo de emergencia"
          value={form.nombre}
          maxLength={60}
          onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Monto objetivo (Bs)">
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.montoObjetivo}
            onChange={(e) =>
              setForm((f) => ({ ...f, montoObjetivo: e.target.value }))
            }
            required
          />
        </Field>
        <Field label="Fecha objetivo (opcional)">
          <Input
            type="date"
            value={form.fechaObjetivo}
            onChange={(e) =>
              setForm((f) => ({ ...f, fechaObjetivo: e.target.value }))
            }
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

export default function MetasPage() {
  const { data, hydrated, addGoal, updateGoal, deleteGoal, addAporte } =
    usePlatik();

  const [modal, setModal] = useState<"nueva" | Goal | null>(null);
  const [aporteGoal, setAporteGoal] = useState<Goal | null>(null);
  const [montoAporte, setMontoAporte] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Goal | null>(null);
  const [aviso, setAviso] = useState("");

  if (!hydrated) return <PanelSkeleton />;
  const moneda = data.profile.moneda;

  function notify(msg: string) {
    setAviso(msg);
    setTimeout(() => setAviso(""), 3000);
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-petroleo sm:text-3xl">
            Metas de ahorro
          </h1>
          <p className="mt-1 text-sm text-tinta-suave">
            Ahorra hoy, construye mañana.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DemoBadge />
          <Button variant="accent" onClick={() => setModal("nueva")}>
            <Plus size={16} /> Nueva meta
          </Button>
        </div>
      </div>

      {aviso && (
        <p className="anim-fade-up rounded-xl bg-menta-100 px-4 py-3 text-sm font-medium text-menta-700">
          {aviso}
        </p>
      )}

      {/* Aviso honesto sobre el alcance */}
      <Card className="flex gap-3 border-lavanda/30 bg-lavanda-50 p-4">
        <Coins size={20} className="mt-0.5 shrink-0 text-lavanda-600" />
        <p className="text-sm text-tinta-suave">
          Las metas son <strong>registros internos de PLATIK</strong>: sirven para
          planificar tu ahorro, pero todavía no representan fondos depositados en
          una blockchain. La conexión con USDC en Stellar Testnet llega en la
          fase 4.
        </p>
      </Card>

      {data.goals.length === 0 ? (
        <Card>
          <EmptyState
            title="Crea tu primera meta"
            description="Define cuánto quieres juntar y registra aportes para ver tu progreso."
            mascot="celebra"
            action={
              <Button variant="accent" onClick={() => setModal("nueva")}>
                <Plus size={16} /> Nueva meta
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.goals.map((g) => {
            const pct =
              g.montoObjetivo > 0
                ? (g.ahorroAcumulado / g.montoObjetivo) * 100
                : 0;
            const completa = pct >= 100;
            return (
              <Card key={g.id} className="flex flex-col p-5">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-petroleo">{g.nombre}</h3>
                    {g.fechaObjetivo && (
                      <p className="mt-0.5 text-xs text-tinta-suave">
                        Objetivo: {formatFecha(g.fechaObjetivo)}
                      </p>
                    )}
                  </div>
                  {completa && <Badge tone="menta">¡Lograda!</Badge>}
                </div>
                <p className="text-2xl font-bold text-petroleo">
                  {formatMoney(g.ahorroAcumulado, moneda)}
                  <span className="ml-1.5 text-sm font-normal text-tinta-suave">
                    de {formatMoney(g.montoObjetivo, moneda)}
                  </span>
                </p>
                <div className="mt-3">
                  <ProgressBar
                    value={pct}
                    tone={completa ? "menta" : "lavanda"}
                  />
                  <p className="mt-1 text-right text-xs text-tinta-suave">
                    {formatPct(pct, 0)}
                  </p>
                </div>
                <div className="mt-auto flex items-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setAporteGoal(g);
                      setMontoAporte("");
                    }}
                  >
                    <PiggyBank size={15} /> Registrar aporte
                  </Button>
                  <button
                    onClick={() => setModal(g)}
                    aria-label={`Editar ${g.nombre}`}
                    className="rounded-xl border border-petroleo/15 p-2.5 text-tinta-suave hover:border-petroleo/40 hover:text-petroleo"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(g)}
                    aria-label={`Eliminar ${g.nombre}`}
                    className="rounded-xl border border-petroleo/15 p-2.5 text-tinta-suave hover:border-coral-600/50 hover:text-coral-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal nueva / editar meta */}
      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === "nueva" ? "Nueva meta de ahorro" : "Editar meta"}
      >
        {modal !== null && (
          <GoalForm
            key={modal === "nueva" ? "nueva" : modal.id}
            initial={
              modal === "nueva"
                ? { nombre: "", montoObjetivo: "", fechaObjetivo: "" }
                : {
                    nombre: modal.nombre,
                    montoObjetivo: String(modal.montoObjetivo),
                    fechaObjetivo: modal.fechaObjetivo ?? "",
                  }
            }
            submitLabel={modal === "nueva" ? "Crear meta" : "Guardar cambios"}
            onCancel={() => setModal(null)}
            onSubmit={(f) => {
              if (modal === "nueva") {
                addGoal({
                  nombre: f.nombre.trim(),
                  montoObjetivo: Number(f.montoObjetivo),
                  ahorroAcumulado: 0,
                  fechaObjetivo: f.fechaObjetivo || undefined,
                });
                notify("Meta creada. ¡Vamos por ese ahorro!");
              } else {
                updateGoal({
                  ...modal,
                  nombre: f.nombre.trim(),
                  montoObjetivo: Number(f.montoObjetivo),
                  fechaObjetivo: f.fechaObjetivo || undefined,
                });
                notify("Meta actualizada.");
              }
              setModal(null);
            }}
          />
        )}
      </Modal>

      {/* Modal aporte */}
      <Modal
        open={aporteGoal !== null}
        onClose={() => setAporteGoal(null)}
        title={`Aporte a “${aporteGoal?.nombre ?? ""}”`}
      >
        {aporteGoal && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const monto = Number(montoAporte);
              if (!Number.isFinite(monto) || monto <= 0) return;
              addAporte(aporteGoal.id, monto);
              setAporteGoal(null);
              notify(`Aporte de ${formatMoney(monto, moneda)} registrado.`);
            }}
          >
            <p className="text-sm text-tinta-suave">
              Este aporte es un registro de demostración: actualiza tu progreso
              pero no mueve dinero real.
            </p>
            <Field label="Monto del aporte (Bs)">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={montoAporte}
                onChange={(e) => setMontoAporte(e.target.value)}
                required
                autoFocus
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAporteGoal(null)}>
                Cancelar
              </Button>
              <Button type="submit" variant="accent">
                Registrar aporte
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirmar eliminación */}
      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar meta"
      >
        {confirmDelete && (
          <div className="space-y-4">
            <p className="text-sm text-tinta-suave">
              ¿Eliminar la meta <strong>“{confirmDelete.nombre}”</strong>? Perderás
              el registro de tus aportes.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  deleteGoal(confirmDelete.id);
                  setConfirmDelete(null);
                  notify("Meta eliminada.");
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
