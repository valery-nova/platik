import type { TxType } from "./types";

export const CATEGORIAS: Record<TxType, string[]> = {
  ingreso: [
    "Ventas",
    "Servicios",
    "Comisiones",
    "Trabajo freelance",
    "Otros ingresos",
  ],
  costo: [
    "Mercadería / insumos",
    "Materia prima",
    "Comisiones de venta",
    "Envíos",
    "Otros costos",
  ],
  gasto: [
    "Alquiler",
    "Servicios básicos",
    "Sueldos y honorarios",
    "Marketing",
    "Herramientas y software",
    "Transporte",
    "Impuestos",
    "Otros gastos",
  ],
};

export const TODAS_CATEGORIAS = [
  ...new Set(Object.values(CATEGORIAS).flat()),
];
