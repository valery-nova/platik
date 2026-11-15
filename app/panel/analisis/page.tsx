"use client";

import Image from "next/image";
import { Info, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardHeader, DemoBadge, PanelSkeleton } from "@/components/ui";
import { EvolucionChart, DistribucionChart } from "@/components/charts";
import { usePlatik } from "@/lib/store";
import {
  gananciaNeta,
  margenGanancia,
  serieMensual,
  totalByType,
  totalEgresos,
  totalesPorCategoria,
  txInRange,
  haceDiasISO,
  hoyISO,
} from "@/lib/finance";
import { formatMoney, formatPct } from "@/lib/format";

export default function AnalisisPage() {
  const { data, hydrated } = usePlatik();
  if (!hydrated) return <PanelSkeleton />;

  const moneda = data.profile.moneda;
  const txs = data.transactions;

  // Dos ventanas contiguas de 30 días: [hoy-29, hoy] y [hoy-59, hoy-30].
  const ultimos30 = txInRange(txs, haceDiasISO(29));
  const previos30 = txInRange(txs, haceDiasISO(59), haceDiasISO(30));

  const ingresos = totalByType(ultimos30, "ingreso", moneda);
  const costos = totalByType(ultimos30, "costo", moneda);
  const gastos = totalByType(ultimos30, "gasto", moneda);
  const egresos = totalEgresos(ultimos30, moneda);
  const neta = gananciaNeta(ultimos30, moneda);
  const margen = margenGanancia(ultimos30, moneda);
  const gananciaNetaValor = neta.ganancia;

  const ingresosPrev = totalByType(previos30, "ingreso", moneda);
  const variacionIngresos =
    ingresosPrev.total > 0
      ? ((ingresos.total - ingresosPrev.total) / ingresosPrev.total) * 100
      : 0;

  const serie = serieMensual(txs, 6, hoyISO(), moneda);
  const topGastos = totalesPorCategoria(ultimos30, moneda, ["gasto", "costo"]);
  const mayorGasto = topGastos[0];
  const topIngresos = totalesPorCategoria(ultimos30, moneda, ["ingreso"])[0];

  // El gráfico muestra las 5 categorías mayores y agrupa el resto en
  // "Otros" para que la distribución sume 100% como la lista.
  const pieGastos =
    topGastos.length <= 6
      ? topGastos
      : [
          ...topGastos.slice(0, 5),
          {
            categoria: "Otros",
            total: topGastos.slice(5).reduce((a, c) => a + c.total, 0),
            porcentaje: topGastos
              .slice(5)
              .reduce((a, c) => a + c.porcentaje, 0),
          },
        ];

  // Explicaciones deterministas generadas a partir de los números.
  const explicaciones: string[] = [];
  if (ultimos30.length === 0) {
    explicaciones.push(
      "No hay movimientos en los últimos 30 días. Registra transacciones en la pestaña Transacciones para ver aquí qué pasa con tu dinero.",
    );
  } else if (gananciaNetaValor >= 0) {
    explicaciones.push(
      `En los últimos 30 días tu negocio generó ${formatMoney(gananciaNetaValor, moneda)} de ganancia estimada: de cada ${moneda} 100 que entraron, te quedaron aproximadamente ${moneda} ${Math.round(margen ?? 0)}.`,
    );
  } else {
    explicaciones.push(
      `En los últimos 30 días tus egresos superaron a tus ingresos por ${formatMoney(Math.abs(gananciaNetaValor), moneda)}. Revisa los gastos más grandes para recuperar el equilibrio.`,
    );
  }
  if (topIngresos) {
    explicaciones.push(
      `Tu principal fuente de ingreso fue “${topIngresos.categoria}” con ${formatMoney(topIngresos.total, moneda)} (${formatPct(topIngresos.porcentaje, 0)} de lo que entra).`,
    );
  }
  if (mayorGasto) {
    explicaciones.push(
      `El egreso más grande fue “${mayorGasto.categoria}” con ${formatMoney(mayorGasto.total, moneda)} (${formatPct(mayorGasto.porcentaje, 0)} de lo que sale).`,
    );
  }
  if (ingresosPrev.total > 0) {
    explicaciones.push(
      variacionIngresos >= 0
        ? `Tus ingresos crecieron ${formatPct(Math.abs(variacionIngresos))} respecto al periodo anterior.`
        : `Tus ingresos bajaron ${formatPct(Math.abs(variacionIngresos))} respecto al periodo anterior.`,
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-petroleo sm:text-3xl">
            Análisis financiero
          </h1>
          <p className="mt-1 text-sm text-tinta-suave">
            Qué está pasando con tu dinero, en lenguaje sencillo.
          </p>
        </div>
        <DemoBadge />
      </div>

      {/* KPIs del periodo */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            titulo: "Ingresos totales",
            valor: formatMoney(ingresos.total, moneda),
            icon: <TrendingUp size={18} />,
            cls: "text-menta-700",
          },
          {
            titulo: "Costos + gastos",
            valor: formatMoney(egresos.total, moneda),
            sub: `costos ${formatMoney(costos.total, moneda)} · gastos ${formatMoney(gastos.total, moneda)}`,
            icon: <TrendingDown size={18} />,
            cls: "text-coral-600",
          },
          {
            titulo: "Ganancia neta estimada",
            valor: formatMoney(gananciaNetaValor, moneda),
            icon: gananciaNetaValor >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />,
            cls: gananciaNetaValor >= 0 ? "text-menta-700" : "text-coral-600",
          },
          {
            titulo: "Margen de ganancia",
            valor: formatPct(margen ?? 0),
            sub: (margen ?? 0) >= 25 ? "margen saludable" : "margen ajustado",
            icon: <Info size={18} />,
            cls: "text-petroleo",
          },
        ].map((k) => (
          <Card key={k.titulo} className="p-5">
            <p className="flex items-center gap-1.5 text-sm text-tinta-suave">
              {k.icon} {k.titulo}
            </p>
            <p className={`mt-1.5 text-2xl font-bold ${k.cls}`}>{k.valor}</p>
            {k.sub && <p className="mt-1 text-xs text-tinta-suave">{k.sub}</p>}
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Evolución mensual */}
        <Card className="p-5">
          <CardHeader
            title="Evolución mensual"
            subtitle="Ingresos y ganancia neta por mes"
          />
          <EvolucionChart serie={serie} moneda={moneda} />
        </Card>

        {/* Categorías de egreso */}
        <Card className="p-5">
          <CardHeader
            title="Principales egresos por categoría"
            subtitle="Costos + gastos, últimos 30 días"
          />
          {pieGastos.length > 0 ? (
            <>
              <DistribucionChart
                items={pieGastos.map((c) => ({
                  nombre: c.categoria,
                  valor: c.total,
                }))}
                moneda={moneda}
              />
              <ul className="mt-3 space-y-1.5">
                {topGastos.map((c) => (
                  <li
                    key={c.categoria}
                    className="flex justify-between text-sm text-tinta-suave"
                  >
                    <span>{c.categoria}</span>
                    <span className="font-medium text-tinta">
                      {formatMoney(c.total, moneda)} · {formatPct(c.porcentaje, 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-tinta-suave">
              Aún no hay egresos registrados en el periodo.
            </p>
          )}
        </Card>
      </div>

      {/* Explicaciones sencillas */}
      <Card className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <Image
            src="/brand/mascota/expresiones/expresion-explica.png"
            alt="Mascota de PLATIK explicando"
            width={130}
            height={130}
            className="h-28 w-auto shrink-0 self-center object-contain sm:self-start"
          />
          <div>
            <h3 className="text-lg font-semibold text-petroleo">
              Tu negocio, explicado simple
            </h3>
            <ul className="mt-3 space-y-2.5">
              {explicaciones.map((e, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-tinta-suave">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-menta-600" />
                  {e}
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-lavanda-50 px-4 py-3 text-xs text-lavanda-600">
              Estas lecturas se calculan con fórmulas deterministas sobre tus
              datos de demostración. En la fase 3, el copiloto con IA podrá
              responder preguntas sobre ellos — siempre sin inventar cifras.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
