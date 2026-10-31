"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getYear = () => new Date().getFullYear();
// null en el prerender: con cacheComponents no se permite new Date() ahí.
const getPrerender = () => null;

export function YearNote() {
  const year = useSyncExternalStore(subscribe, getYear, getPrerender);
  return (
    <p className="text-xs text-tinta-suave">
      © {year ?? "…"} PLATIK · Finanzas claras, decisiones inteligentes.
    </p>
  );
}
