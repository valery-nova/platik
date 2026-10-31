"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MesSerie } from "@/lib/finance";
import { formatMoney, nombreMes } from "@/lib/format";
import type { Currency } from "@/lib/types";

const PETROLEO = "#0b3d3b";
const MENTA = "#35b183";
const CORAL = "#f25565";
const LAVANDA = "#8b66f6";
const TINTA_SUAVE = "#4c6a67";

function MoneyTooltip({
  active,
  payload,
  label,
  moneda,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color?: string }[];
  label?: string;
  moneda: Currency;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-petroleo/10 bg-white px-3.5 py-2.5 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-petroleo">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-tinta-suave">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: p.color }}
          />
          {p.name}:{" "}
          <span className="font-semibold text-tinta">
            {formatMoney(p.value, moneda)}
          </span>
        </p>
      ))}
    </div>
  );
}

export function IngresosEgresosChart({
  serie,
  moneda,
}: {
  serie: MesSerie[];
  moneda: Currency;
}) {
  const data = serie.map((s) => ({
    mes: nombreMes(s.mes),
    Ingresos: s.ingresos,
    Egresos: s.egresos,
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#0b3d3b14" vertical={false} />
        <XAxis
          dataKey="mes"
          tick={{ fill: TINTA_SUAVE, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: TINTA_SUAVE, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
        />
        <Tooltip content={<MoneyTooltip moneda={moneda} />} cursor={{ fill: "#0b3d3b08" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Ingresos" fill={MENTA} radius={[6, 6, 0, 0]} maxBarSize={34} />
        <Bar dataKey="Egresos" fill={CORAL} radius={[6, 6, 0, 0]} maxBarSize={34} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EvolucionChart({
  serie,
  moneda,
}: {
  serie: MesSerie[];
  moneda: Currency;
}) {
  const data = serie.map((s) => ({
    mes: nombreMes(s.mes),
    Ingresos: s.ingresos,
    "Ganancia neta": s.ganancia,
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#0b3d3b14" vertical={false} />
        <XAxis
          dataKey="mes"
          tick={{ fill: TINTA_SUAVE, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: TINTA_SUAVE, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
        />
        <Tooltip content={<MoneyTooltip moneda={moneda} />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="Ingresos"
          stroke={MENTA}
          strokeWidth={2.5}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="Ganancia neta"
          stroke={PETROLEO}
          strokeWidth={2.5}
          dot={{ r: 3 }}
          strokeDasharray="6 3"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS = [PETROLEO, MENTA, LAVANDA, CORAL, "#7cc7bc", "#ffb3ba"];

export function DistribucionChart({
  items,
  moneda,
}: {
  items: { nombre: string; valor: number }[];
  moneda: Currency;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={items}
          dataKey="valor"
          nameKey="nombre"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          stroke="none"
        >
          {items.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatMoney(Number(value), moneda)}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #0b3d3b14",
            fontSize: 12,
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(v: string) => <span style={{ color: TINTA_SUAVE }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
