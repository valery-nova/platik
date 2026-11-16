"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";
import { writeMode, type PlatikMode } from "@/lib/storage";

const OPCIONES: {
  mode: PlatikMode;
  titulo: string;
  descripcion: string;
  icon: React.ReactNode;
}[] = [
  {
    mode: "beta",
    titulo: "Comenzar desde cero",
    descripcion:
      "Comienza tu experiencia financiera desde cero. Registra tu dinero disponible, configura tu capital y administra tus ingresos y gastos con tus propios datos.",
    icon: <PlayCircle size={22} />,
  },
  {
    mode: "demo",
    titulo: "Explorar con datos de ejemplo",
    descripcion:
      "Explora PLATIK con información financiera de ejemplo y descubre cómo funcionan sus herramientas, indicadores y funcionalidades.",
    icon: <Sparkles size={22} />,
  },
];

export function ProbarPlatik({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function elegir(mode: PlatikMode) {
    writeMode(window.localStorage, mode);
    setOpen(false);
    router.push("/panel");
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-petroleo/50 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Probar PLATIK"
          onClick={() => setOpen(false)}
        >
          <div
            className="anim-pop w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-petroleo">Probar PLATIK</h2>
            <p className="mt-1 text-sm text-tinta-suave">
              Elige cómo quieres empezar. Cada modalidad tiene su propio espacio de datos.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {OPCIONES.map((o) => (
                <button
                  key={o.mode}
                  type="button"
                  onClick={() => elegir(o.mode)}
                  className="group flex flex-col items-start gap-3 rounded-2xl border border-petroleo/15 p-5 text-left transition-colors hover:border-menta-600 hover:bg-menta-50"
                >
                  <span className="text-menta-700">{o.icon}</span>
                  <span>
                    <span className="block font-semibold text-petroleo">{o.titulo}</span>
                    <span className="mt-1 block text-sm text-tinta-suave">{o.descripcion}</span>
                  </span>
                  <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-menta-700 group-hover:underline">
                    Continuar <ArrowRight size={15} />
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-tinta-suave">
              La prueba personalizada es de 72 horas; te informaremos el tiempo por separado.
              La demostración con datos de ejemplo siempre está disponible.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
