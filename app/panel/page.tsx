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
  const { transactions, goals, profile, distribution } = data;
  const moneda = profile.moneda;

  const ultimos30 = txInRange(transactions, haceDiasISO(29));
  const ingresos = totalByType(ultimos30, "ingreso");
  const egresos = totalEgresos(ultimos30);
  const neta = gananciaNeta(ultimos30);
  const margen = margenGanancia(ultimos30);
  const serie = serieMensual(transactions, 6);
  const ultimas = ultimasTransacciones(transactions, 6);

  const distribucion = [
    { nombre: "Operación", valor: Math.max(0, (neta * distribution.operacion) / 100) },
    { nombre: "Reinversión", valor: Math.max(0, (neta * distribution.reinversion) / 100) },
    { nombre: "Ahorro", valor: Math.max(0, (neta * distribution.ahorro) / 100) },
  ];

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
          valor={formatMoney(ingresos, moneda)}
          detalle="últimos 30 días"
          icon={<ArrowUpRight size={20} />}
          tone="menta"
        />
        <KpiCard
          titulo="Gastos y costos"
          valor={formatMoney(egresos, moneda)}
          detalle="últimos 30 días"
          icon={<ArrowDownRight size={20} />}
          tone="coral"
        />
        <KpiCard
          titulo="Ganancia neta estimada"
          valor={formatMoney(neta, moneda)}
          detalle={neta >= 0 ? "tu negocio va en positivo" : "revisa tus egresos"}
          icon={<Wallet size={20} />}
          tone="petroleo"
        />
        <KpiCard
          titulo="Rentabilidad"
          valor={formatPct(margen)}
          detalle="ganancia por cada Bs 100 vendidos"
          icon={<TrendingUp size={20} />}
          tone="lavanda"
        />
      </div>

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
        </Card>

        {/* Distribución sugerida */}
        <Card className="p-5">
          <CardHeader
            title="Distribución del dinero"
            subtitle="Propuesta editable sobre tu ganancia"
          />
          {neta > 0 ? (
            <>
              <DistribucionChart items={distribucion} moneda={moneda} />
              <p className="mt-2 text-center text-xs text-tinta-suave">
                {distribution.operacion}% operación · {distribution.reinversion}%
                reinversión · {distribution.ahorro}% ahorro
              </p>
            </>
          ) : (
            <EmptyState
              title="Sin ganancia en el periodo"
              description="Cuando tus ingresos superen a los egresos verás aquí cómo distribuir el excedente."
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
                    {formatMoney(t.monto, moneda)}
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
                    {formatMoney(g.ahorroAcumulado, moneda)} de{" "}
                    {formatMoney(g.montoObjetivo, moneda)}
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
          </div>
        </Card>
      </div>

      {/* Ayuda de la mascota */}
      <Card className="flex flex-col items-center gap-4 bg-gradient-to-r from-menta-50 to-lavanda-50 p-6 sm:flex-row">
        <Image
          src="/brand/mascot_analiza.png"
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
