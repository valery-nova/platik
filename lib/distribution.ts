/**
 * Distribución del dinero disponible: catálogo, valores por perfil,
 * validación, conversión porcentaje↔importe y recomendación transparente.
 * Es la fuente de verdad única para esos cálculos.
 */
import type { DistributionCategory, UserProfileType } from "./types";
import { currencyDigits } from "./currency/catalog";
import { roundToCurrency } from "./currency/decimal";

export interface DistributionDefinition {
  key: string;
  nombre: string;
  descripcion: string;
}

export const DISTRIBUTION_CATALOG: DistributionDefinition[] = [
  {
    key: "capital_operativo",
    nombre: "Capital operativo",
    descripcion: "Reserva para sostener la operación: costos, gastos fijos y próximos pagos.",
  },
  {
    key: "reserva_emergencia",
    nombre: "Reserva de emergencia",
    descripcion: "Dinero apartado para imprevistos o meses con menores ingresos.",
  },
  {
    key: "impuestos_obligaciones",
    nombre: "Impuestos y obligaciones",
    descripcion: "Provisionar lo que corresponde a impuestos, cuotas y compromisos.",
  },
  {
    key: "ahorro",
    nombre: "Ahorro",
    descripcion: "Lo que apartas para tus metas de ahorro y tu fondo futuro.",
  },
  {
    key: "capital_crecimiento",
    nombre: "Capital de crecimiento",
    descripcion: "Dinero para hacer crecer el negocio: inventario, herramientas, marketing.",
  },
  {
    key: "retiro_personal",
    nombre: "Retiro personal",
    descripcion: "Lo que te autorizas a retirar para tus gastos personales.",
  },
];

const CATALOGO = new Map(DISTRIBUTION_CATALOG.map((c) => [c.key, c]));

export function categoriaPorKey(key: string): DistributionDefinition | undefined {
  return CATALOGO.get(key);
}

const DEFAULTS: Record<UserProfileType, { key: string; porcentaje: number }[]> = {
  independiente: [
    { key: "capital_operativo", porcentaje: 40 },
    { key: "reserva_emergencia", porcentaje: 20 },
    { key: "impuestos_obligaciones", porcentaje: 10 },
    { key: "ahorro", porcentaje: 20 },
    { key: "retiro_personal", porcentaje: 10 },
  ],
  freelancer: [
    { key: "capital_operativo", porcentaje: 30 },
    { key: "reserva_emergencia", porcentaje: 15 },
    { key: "impuestos_obligaciones", porcentaje: 15 },
    { key: "ahorro", porcentaje: 20 },
    { key: "capital_crecimiento", porcentaje: 10 },
    { key: "retiro_personal", porcentaje: 10 },
  ],
  emprendedor: [
    { key: "capital_operativo", porcentaje: 35 },
    { key: "reserva_emergencia", porcentaje: 15 },
    { key: "impuestos_obligaciones", porcentaje: 10 },
    { key: "ahorro", porcentaje: 15 },
    { key: "capital_crecimiento", porcentaje: 20 },
    { key: "retiro_personal", porcentaje: 5 },
  ],
  empresa: [
    { key: "capital_operativo", porcentaje: 40 },
    { key: "reserva_emergencia", porcentaje: 10 },
    { key: "impuestos_obligaciones", porcentaje: 15 },
    { key: "ahorro", porcentaje: 10 },
    { key: "capital_crecimiento", porcentaje: 20 },
    { key: "retiro_personal", porcentaje: 5 },
  ],
};

const GENERICO: { key: string; porcentaje: number }[] = [
  { key: "capital_operativo", porcentaje: 50 },
  { key: "reserva_emergencia", porcentaje: 20 },
  { key: "ahorro", porcentaje: 30 },
];

function item(key: string, porcentaje: number): DistributionCategory {
  const def = categoriaPorKey(key);
  return {
    key,
    nombre: def?.nombre ?? key,
    descripcion: def?.descripcion ?? "",
    porcentaje,
  };
}

/** Distribución inicial para un perfil (o genérica si aún no se eligió). */
export function defaultDistributionForProfile(
  tipo?: UserProfileType,
): DistributionCategory[] {
  const base = tipo ? DEFAULTS[tipo] : GENERICO;
  return base.map((d) => item(d.key, d.porcentaje));
}

/** Normaliza datos antiguos: objeto fijo {operacion, reinversion, ahorro} o lista nueva. */
export function migrateDistributionCategories(
  input: unknown,
  tipo?: UserProfileType,
): DistributionCategory[] {
  if (Array.isArray(input)) {
    const out: DistributionCategory[] = [];
    const vistos = new Set<string>();
    for (const raw of input) {
      if (!raw || typeof raw !== "object") continue;
      const r = raw as Partial<DistributionCategory>;
      const key = typeof r.key === "string" && r.key.trim() ? r.key.trim() : "";
      if (!key || vistos.has(key)) continue;
      const porcentaje =
        typeof r.porcentaje === "number" && Number.isFinite(r.porcentaje)
          ? r.porcentaje
          : 0;
      const def = categoriaPorKey(key);
      out.push({
        key,
        nombre:
          typeof r.nombre === "string" && r.nombre.trim()
            ? r.nombre.trim()
            : (def?.nombre ?? key),
        descripcion:
          typeof r.descripcion === "string"
            ? r.descripcion
            : (def?.descripcion ?? ""),
        porcentaje,
      });
      vistos.add(key);
    }
    return out;
  }

  if (input && typeof input === "object") {
    const o = input as Record<string, unknown>;
    const pares: [string, unknown][] = [
      ["capital_operativo", o.operacion ?? o.capital_operativo],
      ["capital_crecimiento", o.reinversion ?? o.capital_crecimiento],
      ["ahorro", o.ahorro],
    ];
    const out = pares
      .filter(([, v]) => typeof v === "number")
      .map(([key, v]) => item(key, v as number));
    if (out.length > 0) return out;
  }

  return defaultDistributionForProfile(tipo);
}

export interface ValidacionDistribucion {
  valida: boolean;
  total: number;
  sinAsignar: number;
  errores: string[];
}

const EPS = 1e-9;

/** Porcentajes entre 0 y 100 por categoría y suma total ≤ 100. */
export function validarDistribucion(
  items: DistributionCategory[],
): ValidacionDistribucion {
  const errores: string[] = [];
  for (const c of items) {
    if (typeof c.porcentaje !== "number" || !Number.isFinite(c.porcentaje)) {
      errores.push(`${c.nombre}: porcentaje inválido.`);
    } else if (c.porcentaje < 0 || c.porcentaje > 100) {
      errores.push(`${c.nombre}: el porcentaje debe estar entre 0 y 100.`);
    }
  }
  const total = Math.round(items.reduce((a, c) => a + (Number.isFinite(c.porcentaje) ? c.porcentaje : 0), 0) * 100) / 100;
  if (errores.length === 0 && total > 100 + EPS) {
    errores.push(`La distribución suma ${total}%: no puede superar el 100% del dinero disponible.`);
  }
  return {
    valida: errores.length === 0,
    total: Number.isFinite(total) ? total : 0,
    sinAsignar: Number.isFinite(total) ? Math.max(0, Math.round((100 - total) * 100) / 100) : 0,
    errores,
  };
}

export interface MontosDistribucion {
  porCategoria: Record<string, number>;
  sinAsignar: number;
  moneda: string;
}

export const DECIMALES_PORCENTAJE = 3;

/** Porcentaje (3 decimales) equivalente a un importe, redondeado hacia arriba. */
export function pctDe(digits: number) {
  const f = 10 ** digits;
  const k = 10 ** DECIMALES_PORCENTAJE;
  return (monto: number, base: number) => {
    if (!(base > 0)) return 0;
    const red = Math.round(monto * f) / f;
    if (red <= 0) return 0;
    return Math.ceil(((red / base) * 100) * k - 1e-9) / k;
  };
}

/**
 * Importes por categoría sobre el dinero disponible. La suma nunca supera el
 * disponible: si el redondeo la excede, se escala proporcionalmente; el
 * remanente de una reparto del 100 % se completa en la categoría mayor.
 */
export function montosDistribucion(
  items: DistributionCategory[],
  disponible: number,
  moneda: string,
): MontosDistribucion | null {
  if (!Number.isFinite(disponible) || disponible < 0) return null;
  const digits = currencyDigits(moneda);
  const base = roundToCurrency(disponible, digits);
  const step = 1 / 10 ** digits;
  const keys = items.map((c) => c.key);
  const porCategoria: Record<string, number> = {};
  const amount = (p: number) => Math.round(((base * Math.max(0, p)) / 100 / step)) * step;
  for (const c of items) porCategoria[c.key] = roundToCurrency(amount(c.porcentaje), digits);

  let asignado = roundToCurrency(keys.reduce((a, k) => a + (porCategoria[k] ?? 0), 0), digits);
  const pctTotal = items.reduce((a, c) => a + c.porcentaje, 0);
  const repartoCompleto = Math.abs(pctTotal - 100) < 1e-6;
  const suma = () => keys.reduce((a, k) => a + (porCategoria[k] ?? 0), 0);

  if (asignado > base && asignado > 0 && keys.length > 0) {
    const escala = base / asignado;
    for (const k of keys) {
      porCategoria[k] = roundToCurrency(
        Math.floor(((porCategoria[k] * escala) / step) + 1e-6) * step,
        digits,
      );
    }
    asignado = roundToCurrency(suma(), digits);
    const remanente = roundToCurrency(base - asignado, digits);
    if (remanente > 0) {
      const mayor = keys.reduce((a, b) => ((porCategoria[b] ?? 0) > (porCategoria[a] ?? 0) ? b : a));
      porCategoria[mayor] = roundToCurrency((porCategoria[mayor] ?? 0) + remanente, digits);
      asignado = roundToCurrency(asignado + remanente, digits);
    }
  } else if (repartoCompleto && base > asignado && keys.length > 0) {
    const remanente = roundToCurrency(base - asignado, digits);
    const mayor = keys.reduce((a, b) => ((porCategoria[b] ?? 0) > (porCategoria[a] ?? 0) ? b : a));
    porCategoria[mayor] = roundToCurrency((porCategoria[mayor] ?? 0) + remanente, digits);
    asignado = roundToCurrency(asignado + remanente, digits);
  }

  return {
    porCategoria,
    sinAsignar: roundToCurrency(Math.max(0, base - asignado), digits),
    moneda: moneda.toUpperCase(),
  };
}

export interface PropuestaDistribucion {
  items: DistributionCategory[];
  montos: MontosDistribucion | null;
  explicacion: string[];
}

/**
 * Recomendación transparente por reglas de negocio: parte del perfil, del
 * dinero disponible y de porcentajes de referencia editables. Nunca aplica
 * nada sin confirmación del usuario.
 */
export function sugerirDistribucion(input: {
  tipoUsuario?: UserProfileType;
  disponible: number | null;
  moneda: string;
}): PropuestaDistribucion {
  const items = defaultDistributionForProfile(input.tipoUsuario);
  const montos =
    input.disponible !== null && input.disponible > 0
      ? montosDistribucion(items, input.disponible, input.moneda)
      : null;
  const perfil = input.tipoUsuario
    ? {
        independiente: "persona independiente",
        freelancer: "freelancer",
        emprendedor: "emprendedor/a",
        empresa: "empresa o pequeño negocio",
      }[input.tipoUsuario]
    : "usuario general";
  const explicacion = [
    `Propuesta para ${perfil}, calculada con reglas transparentes y porcentajes de referencia.`,
    input.disponible !== null && input.disponible > 0
      ? `Montos calculados sobre ${input.disponible.toFixed(2)} ${input.moneda.toUpperCase()} disponibles.`
      : "Aún no hay dinero disponible positivo para repartir; los porcentajes quedan como referencia.",
    "Es un punto de partida editable: revisa y confirma antes de guardarlo. PLATIK no da asesoría financiera personalizada.",
  ];
  return { items, montos, explicacion };
}
