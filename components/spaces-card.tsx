"use client";

import { useState } from "react";
import { Briefcase, Check, Pencil, Plus, Trash2, User } from "lucide-react";
import { Badge, Button, Card, CardHeader, Input } from "@/components/ui";
import { usePlatik } from "@/lib/store";
import { MAX_VENTURES, PERSONAL_SPACE, type VentureType } from "@/lib/storage";

const TIPOS: { value: VentureType; label: string; hint: string }[] = [
  { value: "emprendimiento", label: "Emprendimiento", hint: "Negocio propio en crecimiento" },
  { value: "negocio", label: "Negocio", hint: "Operación más formal" },
  { value: "freelance", label: "Freelance", hint: "Servicios por cuenta propia" },
];

const TIPO_LABEL: Record<VentureType, string> = {
  emprendimiento: "Emprendimiento",
  negocio: "Negocio",
  freelance: "Freelance",
};

export function SpacesCard() {
  const { spaces, ventures, canCreateVenture, selectSpace, createVenture, renameVenture, deleteVenture } =
    usePlatik();
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<VentureType>("emprendimiento");
  const [editando, setEditando] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const activo = spaces.active === PERSONAL_SPACE ? "personal" : spaces.active;

  function crear() {
    if (createVenture(nombre, tipo)) {
      setNombre("");
      setTipo("emprendimiento");
    }
  }

  return (
    <Card className="p-6">
      <CardHeader
        title="Tus espacios financieros"
        subtitle="Separa tus finanzas personales de tu emprendimiento, negocio o trabajo freelance. Cada espacio tiene sus propios ingresos, gastos, metas y distribución."
        action={<Badge tone="menta">{ventures.length}/{MAX_VENTURES} emprendimientos</Badge>}
      />

      <ul className="mt-4 space-y-2">
        <li>
          <button
            type="button"
            onClick={() => selectSpace(PERSONAL_SPACE)}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
              activo === "personal"
                ? "border-menta-600 bg-menta-50"
                : "border-petroleo/10 bg-white hover:border-petroleo/30"
            }`}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-petroleo/10 text-petroleo">
              <User size={17} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-petroleo">Personal</span>
              <span className="block text-xs text-tinta-suave">Tu dinero del día a día, ahorros y metas personales.</span>
            </span>
            {activo === "personal" && <Check size={17} className="text-menta-700" />}
          </button>
        </li>
        {ventures.map((v) => (
          <li key={v.id} className="rounded-xl border border-petroleo/10 p-3">
            {editando === v.id ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  maxLength={60}
                  aria-label="Nombre del espacio"
                  className="min-w-[160px] flex-1"
                />
                <Button
                  variant="accent"
                  disabled={editNombre.trim().length < 2}
                  onClick={() => {
                    renameVenture(v.id, editNombre);
                    setEditando(null);
                  }}
                >
                  Guardar
                </Button>
                <Button variant="ghost" onClick={() => setEditando(null)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => selectSpace(v.id)}
                  className={`flex flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left transition ${
                    activo === v.id ? "bg-menta-50" : "hover:bg-petroleo-50/60"
                  }`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lavanda-100 text-lavanda-600">
                    <Briefcase size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-petroleo">{v.nombre}</span>
                    <span className="block text-xs text-tinta-suave">{TIPO_LABEL[v.tipo]}</span>
                  </span>
                  {activo === v.id && <Check size={17} className="text-menta-700" />}
                </button>
                <button
                  type="button"
                  aria-label={`Renombrar ${v.nombre}`}
                  onClick={() => {
                    setEditando(v.id);
                    setEditNombre(v.nombre);
                  }}
                  className="rounded-lg p-2 text-tinta-suave hover:bg-petroleo-50 hover:text-petroleo"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  aria-label={`Eliminar ${v.nombre}`}
                  onClick={() => setConfirmDelete(confirmDelete === v.id ? null : v.id)}
                  className="rounded-lg p-2 text-coral-600 hover:bg-coral-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
            {confirmDelete === v.id && (
              <div className="mt-3 rounded-xl border border-coral-600/30 bg-coral-50 p-3 text-sm">
                <p className="text-tinta">
                  ¿Eliminar <strong>{v.nombre}</strong>? Se borrarán sus ingresos, gastos, metas y billetera registrados en este navegador.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="danger"
                    onClick={() => {
                      deleteVenture(v.id);
                      setConfirmDelete(null);
                    }}
                  >
                    Sí, eliminar
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {canCreateVenture ? (
        <div className="mt-5 rounded-2xl border border-dashed border-menta-600/40 bg-menta-50/60 p-4">
          <p className="text-sm font-semibold text-petroleo">Agregar emprendimiento</p>
          <p className="mt-1 text-xs text-tinta-suave">
            Máximo {MAX_VENTURES}. Hereda tu moneda y país; el resto de los datos empiezan en cero.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TIPOS.map((tp) => (
              <button
                key={tp.value}
                type="button"
                onClick={() => setTipo(tp.value)}
                title={tp.hint}
                aria-pressed={tipo === tp.value}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  tipo === tp.value
                    ? "border-menta-600 bg-menta-600 text-white"
                    : "border-petroleo/15 bg-white text-tinta-suave hover:border-menta-600"
                }`}
              >
                {tp.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del emprendimiento o negocio"
              maxLength={60}
              aria-label="Nombre del nuevo espacio"
              className="min-w-[200px] flex-1"
            />
            <Button variant="accent" disabled={nombre.trim().length < 2} onClick={crear}>
              <Plus size={16} /> Crear espacio
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-5 rounded-xl bg-petroleo-50 px-4 py-3 text-sm text-tinta-suave">
          Ya tienes {MAX_VENTURES} emprendimientos. Puedes eliminar uno para crear otro.
        </p>
      )}

      <p className="mt-4 text-xs text-tinta-suave">
        El espacio activo aparece en el menú lateral. Cambiar de espacio no mueve ni mezcla tus datos.
      </p>
    </Card>
  );
}
