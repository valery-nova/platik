"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  PiggyBank,
  Scale,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  DemoBadge,
  EmptyState,
  PanelSkeleton,
  ProgressBar,
} from "@/components/ui";
import { DistribucionChart, IngresosEgresosChart } from "@/components/charts";
import {
  BotonActualizarCotizaciones,
  EquivalenciaSecundaria,
} from "@/components/equivalencia";
import { usePlatik } from "@/lib/store";
import {
  gananciaNeta,
  haceDiasISO,
  margenGanancia,
  serieMensual,
  totalByType,
  totalEgresos,
  txInRange,
  ultimasTransacciones,
} from "@/lib/finance";
import { formatFecha, formatMoney, formatPct } from "@/lib/format";
import { hoyISO } from "@/lib/finance";
import { diagnostico } from "@/lib/insights";
import { saldoDisponible } from "@/lib/balance";
import { montosDistribucion } from "@/lib/distribution";

function KpiCard({
  titulo,
  valor,
  detalle,
  icon,
  tone,
}: {
  titulo: string;
  valor: string;
  detalle?: string;
  icon: React.ReactNode;
  tone: "menta" | "coral" | "petroleo" | "lavanda";
}) {
  const tones = {
    menta: "bg-menta-100 text-menta-700",
    coral: "bg-coral-100 text-coral-600",
    petroleo: "bg-petroleo-50 text-petroleo",
    lavanda: "bg-lavanda-100 text-lavanda-600",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-tinta-suave">{titulo}</p>
          <p className="mt-1.5 text-2xl font-bold text-petroleo">{valor}</p>
          {detalle && <p className="mt-1 text-xs text-tinta-suave">{detalle}</p>}
        </div>
        <span className={`rounded-xl p-2.5 ${tones[tone]}`}>{icon}</span>
      </div>
    </Card>
  );
}

const TIPO_LABEL: Record<string, string> = {
  ingreso: "Ingreso",
  gasto: "Gasto",
  costo: "Costo",
};

export default function DashboardPage() {
  const { data, hydrated } = usePlatik();
  if (!hydrated) return <PanelSkeleton />;
  const { transactions, goals, profile, distribution, aportesStellar } = data;
  const moneda = profile.moneda;
  const aportesConfirmados = aportesStellar.filter((a) => a.estado === "confirmada");
  const usdcConfirmado = aportesConfirmados.reduce((s, a) => s + a.importe, 0);

  const ultimos30 = txInRange(transactions, haceDiasISO(29));
  const ingresos = totalByType(ultimos30, "ingreso", moneda);
  const egresos = totalEgresos(ultimos30, moneda);
  const neta = gananciaNeta(ultimos30, moneda);
  const margen = margenGanancia(ultimos30, moneda);
  const serie = serieMensual(transactions, 6, hoyISO(), moneda);
  const ultimas = ultimasTransacciones(transactions, 6);

  const ganancia = neta.ganancia;
  const displayMoneda = profile.displayCurrency?.toUpperCase();
  const mostrarEquivalencia =
    !!displayMoneda && displayMoneda !== moneda.toUpperCase();
  const totalIngresos6m = serie.reduce((a, s) => a + s.ingresos, 0);
  // Hallazgos del período + dinero disponible global (saldo + movimientos).
  const { hallazgos } = diagnostico(
    transactions,
    moneda,
    { desde: haceDiasISO(29), hasta: hoyISO() },
    { desde: haceDiasISO(59), hasta: haceDiasISO(30) },
  );
  const disponible = saldoDisponible(data, moneda);
  const montos =
    disponible.monto !== null && disponible.monto > 0
      ? montosDistribucion(distribution, disponible.monto, moneda)
      : null;
  const distribucion = montos
    ? distribution.map((c) => ({ nombre: c.nombre, valor: montos.porCategoria[c.key] ?? 0 })).concat(
        montos.sinAsignar > 0 ? [{ nombre: "Sin asignar", valor: montos.sinAsignar }] : [],
      )
    : [];

  return (
    <div className="space-y-6 pb-10">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-petroleo sm:text-3xl">
            Hola, {profile.nombreUsuario}
          </h1>
          <p className="mt-1 text-sm text-tinta-suave">
            Así va {profile.nombreNegocio} en los últimos 30 días.
          </p>
        </div>
        <DemoBadge />
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          titulo="Ingresos"
          valor={formatMoney(ingresos.total, moneda)}
          detalle="últimos 30 días"
          icon={<ArrowUpRight size={20} />}
          tone="menta"
        />
        <KpiCard
          titulo="Gastos y costos"
          valor={formatMoney(egresos.total, moneda)}
          detalle="últimos 30 días"
          icon={<ArrowDownRight size={20} />}
          tone="coral"
        />
        <KpiCard
          titulo="Ganancia neta estimada"
          valor={formatMoney(ganancia, moneda)}
          detalle={ganancia >= 0 ? "tu negocio va en positivo" : "revisa tus egresos"}
          icon={<Wallet size={20} />}
          tone="petroleo"
        />
        <KpiCard
          titulo="Rentabilidad"
          valor={margen === null ? "—" : formatPct(margen)}
          detalle={
            margen === null
              ? "sin ingresos en el periodo"
              : `ganancia por cada ${moneda} 100 vendidos`
          }
          icon={<TrendingUp size={20} />}
          tone="lavanda"
        />
      </div>

      {/* Aviso de movimientos pendientes de conversión */}
      {neta.pendientes > 0 && (
        <Card className="border-lavanda-300 bg-lavanda-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-2xl text-sm text-petroleo">
              <strong>{neta.pendientes}</strong> movimiento(s) en otra moneda aún
              no tienen cotización válida y no se incluyen en los totales. Se
              conservan con su importe original; no inventamos equivalencias.
            </p>
            <BotonActualizarCotizaciones />
          </div>
        </Card>
      )}

      {/* Lo más importante: hallazgos deterministas del período */}
      {hallazgos.length > 0 && (
        <Card className="p-5">
          <CardHeader
            title="Lo más importante"
            subtitle="Lecturas calculadas con tus movimientos de los últimos 30 días"
            action={
              <Link
                href="/panel/analisis"
                className="inline-flex items-center gap-1 text-sm font-medium text-menta-700 hover:underline"
              >
                Ver detalle <ArrowRight size={14} />
              </Link>
            }
          />
          <ul className="space-y-2">
            {hallazgos.slice(0, 3).map((h) => (
              <li key={h.id} className="flex gap-2.5 text-sm text-tinta">
                <span
                  aria-hidden
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    h.tono === "positivo"
                      ? "bg-menta-600"
                      : h.tono === "alerta"
                        ? "bg-coral-600"
                        : h.tono === "info"
                          ? "bg-lavanda-600"
                          : "bg-petroleo"
                  }`}
                />
                {h.texto}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Equivalencia informativa en la moneda de visualización */}
      {mostrarEquivalencia && (
        <Card className="p-5">
          <CardHeader
            title="Equivalencia informativa"
            subtitle={`Solo lectura en ${displayMoneda}: no altera tus saldos reales ni tus metas.`}
          />
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-tinta-suave">Ganancia neta estimada (30 días)</span>
              <span className="font-semibold text-petroleo">
                {formatMoney(ganancia, moneda)}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="pl-3 text-xs text-tinta-suave">
                Equivalencia aproximada
              </span>
              <EquivalenciaSecundaria
                monto={ganancia}
                moneda={moneda}
                displayMoneda={displayMoneda}
              />
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Gráfico principal */}
        <Card className="p-5 lg:col-span-2">
          <CardHeader
            title="Ingresos vs. egresos"
            subtitle="Últimos 6 meses"
            action={
              <Link
                href="/panel/analisis"
                className="inline-flex items-center gap-1 text-sm font-medium text-menta-700 hover:underline"
              >
                Ver análisis <ArrowRight size={14} />
              </Link>
            }
          />
          <IngresosEgresosChart serie={serie} moneda={moneda} />
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

        {/* Distribución sugerida */}
        <Card className="p-5">
          <CardHeader
            title="Distribución del dinero"
            subtitle="Tu reparto del dinero disponible (editable)"
          />
          {montos && disponible.monto !== null ? (
            <>
              <p className="mb-1 text-center text-xs text-tinta-suave">
                Dinero disponible:{" "}
                <strong className="text-petroleo">
                  {formatMoney(disponible.monto, moneda)}
                </strong>
                {disponible.estado === "parcial" && " (estimación conservadora)"}
              </p>
              <DistribucionChart items={distribucion} moneda={moneda} />
              <p className="mt-2 text-center text-xs text-tinta-suave">
                {distribution.map((c) => `${c.porcentaje}% ${c.nombre}`).join(" · ")}
              </p>
            </>
          ) : (
            <EmptyState
              title={
                disponible.monto === null
                  ? "Dinero disponible no determinable"
                  : "Sin dinero disponible en el periodo"
              }
              description={disponible.motivo}
              mascot="analiza"
            />
          )}
          <Link
            href="/panel/perfil"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-menta-700 hover:underline"
          >
            Ajustar porcentajes <ArrowRight size={14} />
          </Link>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Últimas transacciones */}
        <Card className="p-5 lg:col-span-2">
          <CardHeader
            title="Últimas transacciones"
            action={
              <Link
                href="/panel/transacciones"
                className="inline-flex items-center gap-1 text-sm font-medium text-menta-700 hover:underline"
              >
                Ver todas <ArrowRight size={14} />
              </Link>
            }
          />
          <ul className="divide-y divide-petroleo/6">
            {ultimas.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    t.tipo === "ingreso"
                      ? "bg-menta-100 text-menta-700"
                      : "bg-coral-100 text-coral-600"
                  }`}
                >
                  {t.tipo === "ingreso" ? (
                    <ArrowUpRight size={16} />
                  ) : (
                    <ArrowDownRight size={16} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-tinta">
                    {t.descripcion}
                  </p>
                  <p className="text-xs text-tinta-suave">
                    {t.categoria} · {formatFecha(t.fecha)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-semibold ${
                      t.tipo === "ingreso" ? "text-menta-700" : "text-coral-600"
                    }`}
                  >
                    {t.tipo === "ingreso" ? "+" : "−"}
                    {formatMoney(t.monto, t.moneda)}
                    {t.moneda !== moneda && (
                      <span className="ml-1 text-[10px] text-tinta-suave">({t.moneda})</span>
                    )}
                  </p>
                  <Badge tone={t.tipo === "ingreso" ? "menta" : "coral"}>
                    {TIPO_LABEL[t.tipo]}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* Metas */}
        <Card className="p-5">
          <CardHeader
            title="Metas de ahorro"
            action={
              <Link
                href="/panel/metas"
                className="inline-flex items-center gap-1 text-sm font-medium text-menta-700 hover:underline"
              >
                Gestionar <ArrowRight size={14} />
              </Link>
            }
          />
          <div className="space-y-4">
            {goals.slice(0, 3).map((g) => {
              const pct = g.montoObjetivo > 0 ? (g.ahorroAcumulado / g.montoObjetivo) * 100 : 0;
              return (
                <div key={g.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-1.5 font-medium text-tinta">
                      <PiggyBank size={14} className="text-lavanda-600" />
                      {g.nombre}
                    </span>
                    <span className="text-xs text-tinta-suave">
                      {formatPct(pct, 0)}
                    </span>
                  </div>
                  <ProgressBar value={pct} tone="lavanda" />
                  <p className="mt-1 text-xs text-tinta-suave">
                    {formatMoney(g.ahorroAcumulado, g.moneda)} de{" "}
                    {formatMoney(g.montoObjetivo, g.moneda)}
                  </p>
                </div>
              );
            })}
            {goals.length === 0 && (
              <EmptyState
                title="Aún no hay metas"
                description="Crea tu primera meta de ahorro y celebra cada avance."
                mascot="celebra"
              />
            )}
            <div className="rounded-xl bg-menta-50 p-3">
              <p className="text-xs text-tinta-suave">
                Ahorro on-chain (USDC de prueba · Stellar Testnet)
              </p>
              <p className="mt-0.5 text-sm font-semibold text-petroleo">
                {usdcConfirmado.toLocaleString("es-BO", { maximumFractionDigits: 7 })} USDC
                <span className="ml-1 font-normal text-tinta-suave">
                  · {aportesConfirmados.length} confirmado(s)
                </span>
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Ayuda de la mascota */}
      <Card className="flex flex-col items-center gap-4 bg-gradient-to-r from-menta-50 to-lavanda-50 p-6 sm:flex-row">
        <Image
          src="/brand/mascota/expresiones/expresion-analiza.png"
          alt=""
          width={110}
          height={110}
          className="h-24 w-auto object-contain"
        />
        <div>
          <h3 className="font-semibold text-petroleo">
            ¿Qué estás viendo? <Scale size={15} className="inline text-menta-600" />
          </h3>
          <p className="mt-1 text-sm text-tinta-suave">
            <strong>Ingresos</strong> es lo que entra por ventas o servicios;{" "}
            <strong>costos</strong> es lo que gastas para producir esas ventas y{" "}
            <strong>gastos</strong> lo que pagas para operar (alquiler, luz,
            marketing). La <strong>ganancia neta</strong> es lo que realmente te
            queda. En la próxima fase, tu copiloto con IA te lo explicará con tus
            propios números.
          </p>
        </div>
      </Card>
    </div>
  );
}
