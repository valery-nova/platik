"use client";

import Image from "next/image";
import { Info, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, CardHeader, DemoBadge, PanelSkeleton } from "@/components/ui";
import { EvolucionChart, DistribucionChart } from "@/components/charts";
import {
  BotonActualizarCotizaciones,
  EquivalenciaSecundaria,
} from "@/components/equivalencia";
import { usePlatik } from "@/lib/store";
import {
  serieMensual,
  totalesPorCategoria,
  txInRange,
  haceDiasISO,
  hoyISO,
} from "@/lib/finance";
import { formatMoney, formatPct } from "@/lib/format";
import {
  diagnostico,
  MIN_MOVIMIENTOS_PERIODO,
  variacionPct,
  type ResumenPeriodo,
  type TonoHallazgo,
} from "@/lib/insights";

const TONO_PUNTO: Record<TonoHallazgo, string> = {
  positivo: "bg-menta-600",
  alerta: "bg-coral-600",
  neutral: "bg-petroleo",
  info: "bg-lavanda-600",
};

function ComparacionPeriodos({
  actual,
  previo,
}: {
  actual: ResumenPeriodo;
  previo: ResumenPeriodo;
}) {
  const moneda = actual.moneda;
  const suficiente = (r: ResumenPeriodo) =>
    r.nIngresos > 0 && r.nIngresos + r.nEgresos >= MIN_MOVIMIENTOS_PERIODO;
  const comparable = suficiente(actual) && suficiente(previo);
  const filas = [
    { etiqueta: "Ingresos", a: actual.ingresos, p: previo.ingresos, subirEsBueno: true },
    { etiqueta: "Costos + gastos", a: actual.egresos, p: previo.egresos, subirEsBueno: false },
    { etiqueta: "Ganancia neta", a: actual.ganancia, p: previo.ganancia, subirEsBueno: true },
  ];
  return (
    <Card className="p-5">
      <CardHeader
        title="Comparación entre períodos"
        subtitle="Últimos 30 días frente a los 30 días anteriores"
      />
      {comparable ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-xs text-tinta-suave">
                <th className="pb-2 font-medium">Concepto</th>
                <th className="pb-2 text-right font-medium">Anterior</th>
                <th className="pb-2 text-right font-medium">Actual</th>
                <th className="pb-2 text-right font-medium">Variación</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                const v = variacionPct(f.a, f.p);
                const mejor = v !== null && (f.subirEsBueno ? v > 0 : v < 0);
                return (
                  <tr key={f.etiqueta} className="border-t border-black/5">
                    <td className="py-2 text-tinta">{f.etiqueta}</td>
                    <td className="py-2 text-right text-tinta-suave">{formatMoney(f.p, moneda)}</td>
                    <td className="py-2 text-right font-medium text-petroleo">{formatMoney(f.a, moneda)}</td>
                    <td
                      className={`py-2 text-right font-medium ${v === null ? "text-tinta-suave" : mejor ? "text-menta-700" : "text-coral-600"}`}
                    >
                      {v === null ? "—" : `${v > 0 ? "+" : ""}${formatPct(v)}`}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-black/5">
                <td className="py-2 text-tinta">Margen</td>
                <td className="py-2 text-right text-tinta-suave">
                  {previo.margen === null ? "—" : formatPct(previo.margen)}
                </td>
                <td className="py-2 text-right font-medium text-petroleo">
                  {actual.margen === null ? "—" : formatPct(actual.margen)}
                </td>
                <td className="py-2 text-right text-tinta-suave">
                  {actual.margen === null || previo.margen === null
                    ? "—"
                    : `${actual.margen - previo.margen > 0 ? "+" : ""}${(actual.margen - previo.margen).toFixed(1)} pts`}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs text-tinta-suave">
            «—» indica que el período anterior no tiene un valor positivo con el que comparar.
          </p>
        </div>
      ) : (
        <p className="py-4 text-sm text-tinta-suave">
          Aún no hay datos suficientes para comparar períodos: necesitamos al
          menos {MIN_MOVIMIENTOS_PERIODO} movimientos con un ingreso en cada
          ventana de 30 días.
        </p>
      )}
    </Card>
  );
}

export default function AnalisisPage() {
  const { data, hydrated } = usePlatik();
  if (!hydrated) return <PanelSkeleton />;

  const moneda = data.profile.moneda;
  const txs = data.transactions;

  // Dos ventanas contiguas de 30 días: [hoy-29, hoy] y [hoy-59, hoy-30].
  const ultimos30 = txInRange(txs, haceDiasISO(29));

  const diag = diagnostico(
    txs,
    moneda,
    { desde: haceDiasISO(29), hasta: hoyISO() },
    { desde: haceDiasISO(59), hasta: haceDiasISO(30) },
  );
  const { actual, previo, disponible, hallazgos } = diag;
  const pendientes = actual.pendientesIngresos + actual.pendientesEgresos;
  const gananciaNetaValor = actual.ganancia;
  const margen = actual.margen;

  const serie = serieMensual(txs, 6, hoyISO(), moneda);
  const totalIngresos6m = serie.reduce((a, s) => a + s.ingresos, 0);
  const displayMoneda = data.profile.displayCurrency?.toUpperCase();
  const mostrarEquivalencia =
    !!displayMoneda && displayMoneda !== moneda.toUpperCase();
  const topGastos = totalesPorCategoria(ultimos30, moneda, ["gasto", "costo"]);

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

      {/* Aviso de movimientos pendientes de conversión: los totales son
          parciales y no deben presentarse como el periodo completo. */}
      {pendientes > 0 && (
        <Card className="border-lavanda-300 bg-lavanda-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-2xl text-sm text-petroleo">
              <strong>{pendientes}</strong> movimiento(s) en otra moneda aún
              no tienen cotización válida y <strong>no se incluyen</strong> en los
              totales ni en las explicaciones de abajo. Se conservan con su
              importe original; no inventamos equivalencias.
            </p>
            <BotonActualizarCotizaciones />
          </div>
        </Card>
      )}

      {/* Equivalencias informativas en la moneda de visualización */}
      {mostrarEquivalencia && (
        <Card className="p-5">
          <CardHeader
            title="Equivalencias informativas"
            subtitle={`Solo lectura en ${displayMoneda}: no altera tus cifras reales.`}
          />
          <div className="space-y-2 text-sm">
            {[
              { etiqueta: "Ingresos (30 días)", monto: actual.ingresos },
              { etiqueta: "Egresos (30 días)", monto: actual.egresos },
              { etiqueta: "Ganancia neta (30 días)", monto: gananciaNetaValor },
            ].map((f) => (
              <div
                key={f.etiqueta}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span className="text-tinta-suave">{f.etiqueta}</span>
                <span className="font-semibold text-petroleo">
                  {formatMoney(f.monto, moneda)}{" "}
                  <EquivalenciaSecundaria
                    monto={f.monto}
                    moneda={moneda}
                    displayMoneda={displayMoneda}
                  />
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* KPIs del periodo: ingresos, egresos, ganancia, margen y dinero
          disponible son conceptos distintos y se muestran por separado. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            titulo: "Ingresos totales",
            valor: formatMoney(actual.ingresos, moneda),
            sub: "todo lo que entró en 30 días",
            icon: <TrendingUp size={18} />,
            cls: "text-menta-700",
          },
          {
            titulo: "Costos + gastos",
            valor: formatMoney(actual.egresos, moneda),
            sub: `costos ${formatMoney(actual.costos, moneda)} · gastos ${formatMoney(actual.gastos, moneda)}`,
            icon: <TrendingDown size={18} />,
            cls: "text-coral-600",
          },
          {
            titulo: "Ganancia neta estimada",
            valor: formatMoney(gananciaNetaValor, moneda),
            sub: "ingresos − costos − gastos",
            icon: gananciaNetaValor >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />,
            cls: gananciaNetaValor >= 0 ? "text-menta-700" : "text-coral-600",
          },
          {
            titulo: "Margen de ganancia",
            valor: margen === null ? "—" : formatPct(margen),
            sub: margen === null ? "sin ingresos en el periodo" : `ganancia por cada ${moneda} 100 vendidos`,
            icon: <Info size={18} />,
            cls: "text-petroleo",
          },
          {
            titulo: "Dinero disponible",
            valor: disponible.monto === null ? "No determinable" : formatMoney(disponible.monto, moneda),
            sub: disponible.motivo,
            icon: <Wallet size={18} />,
            cls: disponible.monto === null ? "text-tinta-suave" : "text-petroleo",
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

      <ComparacionPeriodos actual={actual} previo={previo} />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Evolución mensual */}
        <Card className="p-5">
          <CardHeader
            title="Evolución mensual"
            subtitle="Ingresos y ganancia neta por mes"
          />
          <EvolucionChart serie={serie} moneda={moneda} />
          {mostrarEquivalencia && (
            <p className="mt-2 text-xs text-tinta-suave">
              Equivalencia informativa de los ingresos de 6 meses (
              {formatMoney(totalIngresos6m, moneda)}):{" "}
              <EquivalenciaSecundaria
                monto={totalIngresos6m}
                moneda={moneda}
                displayMoneda={displayMoneda}
                compact
              />
            </p>
          )}
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
            <ul className="mt-3 space-y-3">
              {hallazgos.map((h) => (
                <li key={h.id} className="flex gap-2.5 text-sm text-tinta-suave">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONO_PUNTO[h.tono]}`}
                    aria-hidden
                  />
                  <span>
                    <span className="text-tinta">{h.texto}</span>
                    <span className="mt-0.5 block text-xs text-tinta-suave">
                      Cálculo: {h.calculo}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-lavanda-50 px-4 py-3 text-xs text-lavanda-600">
              Estas lecturas se calculan con reglas deterministas sobre tus
              movimientos registrados, sin enviar datos a terceros. Son
              orientativas: PLATIK no es un asesor financiero, contable ni
              tributario y no promete resultados.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
