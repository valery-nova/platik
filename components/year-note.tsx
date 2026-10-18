"use client";

import { useEffect, useState } from "react";

export function YearNote() {
  const [year, setYear] = useState<number | null>(null);
  useEffect(() => setYear(new Date().getFullYear()), []);
  return (
    <p className="text-xs text-tinta-suave">
      © {year ?? "…"} PLATIK · Finanzas claras, decisiones inteligentes.
    </p>
  );
}
