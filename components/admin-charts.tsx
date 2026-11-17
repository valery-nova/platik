"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesPoint } from "@/lib/admin/metrics";

const PETROLEO = "#0b3d3b";
const MENTA = "#35b183";
const LAVANDA = "#8b66f6";
const TINTA_SUAVE = "#4c6a67";

export function AdminActivityChart({ series }: { series: SeriesPoint[] }) {
  const data = series.map((point) => ({
    label: point.label,
    Visitantes: point.visitors ?? undefined,
    "Páginas vistas": point.pageviews ?? undefined,
    "Usuarios activos": point.activeUsers ?? undefined,
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#0b3d3b14" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: TINTA_SUAVE, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: TINTA_SUAVE, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="Visitantes" stroke={MENTA} strokeWidth={2.5} dot={false} connectNulls />
        <Line type="monotone" dataKey="Páginas vistas" stroke={LAVANDA} strokeWidth={2.5} dot={false} connectNulls />
        <Line type="monotone" dataKey="Usuarios activos" stroke={PETROLEO} strokeWidth={2.5} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
