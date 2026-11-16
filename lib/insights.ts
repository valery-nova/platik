/**
 * Inteligencia financiera determinista (Fase 9).
 *
 * Todo resultado se deriva de cálculos verificables sobre los movimientos
 * registrados, en la moneda principal y usando solo importes con
 * conversión válida (ver lib/finance.ts). No hay modelos externos ni se
 * envían datos a terceros. Cuando los datos no alcanzan, se dice
 * explícitamente y no se generan conclusiones.
 */
import type { Distribution, Transaction } from "./types";
import { currencyDigits } from "./currency/catalog";
import { roundToCurrency } from "./currency/decimal";
import { montoEnBase, totalesPorCategoria, type CategoriaTotal } from "./finance";
import { formatMoney, formatPct } from "./format";

/** Movimientos con importe usable mínimos por período para comparar. */
export const MIN_MOVIMIENTOS_PERIODO = 3;
/** Variación (%) por debajo de la cual se considera estable. */
export const UMBRAL_VARIACION_PCT = 5;
/** Diferencia mínima de margen (puntos porcentuales) para mencionarla. */
export const UMBRAL_MARGEN_PUNTOS = 2;
/** Participación (%) a partir de la cual una categoría "concentra" egresos. */
export const UMBRAL_CONCENTRACION_PCT = 40;

export interface ResumenPeriodo {
  desde: string;
  hasta: string;
  moneda: string;
  ingresos: number;
  costos: number;
  gastos: number;
  /** costos + gastos */
  egresos: number;
  /** ingresos − egresos (puede ser negativa). */
  ganancia: number;
  /** ganancia / ingresos × 100, o null sin ingresos. */
  margen: number | null;
  /** Movimientos con importe usable en la moneda principal. */
  nIngresos: number;
  nEgresos: number;
  /** Movimientos excluidos por no tener conversión válida. */
  pendientesIngresos: number;
  pendientesEgresos: number;
}

export function resumenPeriodo(
  txs: Transaction[],
  moneda: string,
  desde: string,
  hasta: string,
): ResumenPeriodo {
  const digits = currencyDigits(moneda);
  let ingresos = 0;
  let costos = 0;
  let gastos = 0;
  let nIngresos = 0;
  let nEgresos = 0;
  let pendientesIngresos = 0;
  let pendientesEgresos = 0;
  for (const tx of txs) {
    if (tx.fecha < desde || tx.fecha > hasta) continue;
    const v = montoEnBase(tx, moneda);
    const esIngreso = tx.tipo === "ingreso";
    if (v === null) {
      if (esIngreso) pendientesIngresos += 1;
      else pendientesEgresos += 1;
      continue;
    }
    if (esIngreso) {
      ingresos += v;
      nIngresos += 1;
    } else {
      if (tx.tipo === "costo") costos += v;
      else gastos += v;
      nEgresos += 1;
    }
  }
  ingresos = roundToCurrency(ingresos, digits);
  costos = roundToCurrency(costos, digits);
  gastos = roundToCurrency(gastos, digits);
  const egresos = roundToCurrency(costos + gastos, digits);
  const ganancia = roundToCurrency(ingresos - egresos, digits);
  return {
    desde,
    hasta,
    moneda: moneda.toUpperCase(),
    ingresos,
    costos,
    gastos,
    egresos,
    ganancia,
    margen: ingresos > 0 ? (ganancia / ingresos) * 100 : null,
    nIngresos,
    nEgresos,
    pendientesIngresos,
    pendientesEgresos,
  };
}

/** Variación porcentual, o null si el valor de referencia no es positivo. */
export function variacionPct(actual: number, previo: number): number | null {
  if (!(previo > 0)) return null;
  return ((actual - previo) / previo) * 100;
}

// ---------------------------------------------------------------------------
// Dinero disponible
// ---------------------------------------------------------------------------

/**
 * - determinado: excedente calculado con todos los movimientos del período.
 * - parcial: hay ingresos sin cotización; el excedente es conservador
 *   (nunca mayor que el real), por lo que puede distribuirse.
 * - incompleto: hay egresos sin cotización; el excedente podría estar
 *   sobrestimado, así que no se determina ni se distribuye.
 * - sin_datos: no hay ingresos usables en el período.
 */
export type EstadoDisponible = "determinado" | "parcial" | "incompleto" | "sin_datos";

export interface DineroDisponible {
  estado: EstadoDisponible;
  /** Importe distribuible (≥ 0) en la moneda principal, o null si no se puede determinar. */
  monto: number | null;
  moneda: string;
  motivo: string;
}

/**
 * Dinero disponible = excedente del período (ingresos − costos − gastos)
 * cuando es positivo. No equivale a los ingresos brutos ni al saldo
 * bancario: es lo que queda tras cubrir los egresos registrados.
 */
export function dineroDisponible(r: ResumenPeriodo): DineroDisponible {
  const moneda = r.moneda;
  if (r.pendientesEgresos > 0) {
    return {
      estado: "incompleto",
      monto: null,
      moneda,
      motivo: `${r.pendientesEgresos} egreso(s) en otra moneda no tienen cotización válida. Sin ellos el excedente podría estar sobrestimado, así que no calculamos el dinero disponible.`,
    };
  }
  if (r.nIngresos === 0) {
    return {
      estado: "sin_datos",
      monto: null,
      moneda,
      motivo:
        r.pendientesIngresos > 0
          ? "Tus ingresos del período aún no tienen cotización válida en tu moneda principal."
          : "No hay ingresos registrados en el período.",
    };
  }
  if (r.ganancia <= 0) {
    return {
      estado: r.pendientesIngresos > 0 ? "parcial" : "determinado",
      monto: 0,
      moneda,
      motivo: "Los egresos igualan o superan a los ingresos: no hay excedente para distribuir.",
    };
  }
  if (r.pendientesIngresos > 0) {
    return {
      estado: "parcial",
      monto: r.ganancia,
      moneda,
      motivo: `Estimación conservadora: ${r.pendientesIngresos} ingreso(s) sin cotización válida no se cuentan.`,
    };
  }
  return {
    estado: "determinado",
    monto: r.ganancia,
    moneda,
    motivo: "Excedente del período tras cubrir costos y gastos registrados.",
  };
}

// ---------------------------------------------------------------------------
// Interpretación de resultados
// ---------------------------------------------------------------------------

export type TonoHallazgo = "positivo" | "alerta" | "neutral" | "info";

export interface Hallazgo {
  id: string;
  tono: TonoHallazgo;
  texto: string;
  /** Cálculo que respalda el hallazgo, para que el usuario pueda verificarlo. */
  calculo: string;
}

export interface EntradaInterpretacion {
  actual: ResumenPeriodo;
  /** Los cálculos asumen que no hay egresos/ingresos excluidos por falta de cotización. */
  totalesCompletos?: boolean;
  previo: ResumenPeriodo;
  /** Egresos (costos + gastos) por categoría del período actual. */
  categoriasEgreso: CategoriaTotal[];
  /** Ingresos por categoría del período actual. */
  categoriasIngreso: CategoriaTotal[];
}

function suficiente(r: ResumenPeriodo): boolean {
  return r.nIngresos + r.nEgresos >= MIN_MOVIMIENTOS_PERIODO && r.nIngresos > 0;
}

export function interpretar({
  actual,
  previo,
  categoriasEgreso,
  categoriasIngreso,
  totalesCompletos = true,
}: EntradaInterpretacion): Hallazgo[] {
  const entradaTotalesCompletos = totalesCompletos;
  const m = actual.moneda;
  const completos = entradaTotalesCompletos;
  const money = (v: number) => formatMoney(v, m);
  const out: Hallazgo[] = [];
  const pendientes = actual.pendientesIngresos + actual.pendientesEgresos;

  if (actual.nIngresos + actual.nEgresos === 0) {
    out.push({
      id: "sin_datos",
      tono: "info",
      texto:
        "No hay movimientos con importe en tu moneda principal en este período. Registra transacciones para ver qué pasa con tu dinero.",
      calculo: "0 movimientos usables",
    });
    if (pendientes > 0) out.push(hallazgoPendientes(pendientes));
    return out;
  }

  // Resultado del período: es un cálculo directo, no una tendencia.
  if (actual.nIngresos > 0) {
    const margen = actual.margen ?? 0;
    if (actual.ganancia > 0) {
      out.push({
        id: "resultado_positivo",
        tono: "positivo",
        texto: `El período deja una ganancia estimada de ${money(actual.ganancia)}: de cada ${m} 100 que entraron quedaron aproximadamente ${m} ${Math.round(margen)}.`,
        calculo: `${money(actual.ingresos)} − ${money(actual.egresos)} = ${money(actual.ganancia)}; margen ${formatPct(margen)}`,
      });
    } else if (actual.ganancia < 0) {
      out.push({
        id: "resultado_negativo",
        tono: "alerta",
        texto: `Los egresos superaron a los ingresos por ${money(Math.abs(actual.ganancia))}. Revisa las categorías de mayor gasto.`,
        calculo: `${money(actual.ingresos)} − ${money(actual.egresos)} = ${money(actual.ganancia)}`,
      });
    } else {
      out.push({
        id: "resultado_cero",
        tono: "neutral",
        texto: "Los ingresos cubrieron exactamente los egresos: el período no deja excedente.",
        calculo: `${money(actual.ingresos)} − ${money(actual.egresos)} = ${money(0)}`,
      });
    }
  } else {
    out.push({
      id: "sin_ingresos",
      tono: "alerta",
      texto: `El período solo registra egresos (${money(actual.egresos)}) y ningún ingreso usable.`,
      calculo: `${actual.nEgresos} egreso(s), 0 ingresos`,
    });
  }

  // Tendencias: solo con datos suficientes en ambos períodos.
  if (!suficiente(actual)) {
    out.push({
      id: "datos_insuficientes",
      tono: "info",
      texto: `Hay pocos movimientos (${actual.nIngresos + actual.nEgresos}) para establecer una tendencia confiable. Con al menos ${MIN_MOVIMIENTOS_PERIODO}, incluido un ingreso, podremos comparar períodos.`,
      calculo: `${actual.nIngresos} ingreso(s), ${actual.nEgresos} egreso(s)`,
    });
  } else if (!suficiente(previo)) {
    out.push({
      id: "sin_comparacion",
      tono: "info",
      texto:
        "El período anterior no tiene datos suficientes para comparar, así que aún no hablamos de tendencias.",
      calculo: `Período anterior: ${previo.nIngresos} ingreso(s), ${previo.nEgresos} egreso(s)`,
    });
  } else {
    const vIng = variacionPct(actual.ingresos, previo.ingresos);
    if (vIng !== null) {
      out.push(
        Math.abs(vIng) < UMBRAL_VARIACION_PCT
          ? {
              id: "ingresos_estables",
              tono: "neutral",
              texto: "Tus ingresos se mantuvieron estables respecto al período anterior.",
              calculo: `${money(previo.ingresos)} → ${money(actual.ingresos)} (${formatPct(vIng)})`,
            }
          : {
              id: vIng > 0 ? "ingresos_suben" : "ingresos_bajan",
              tono: vIng > 0 ? "positivo" : "alerta",
              texto: `Tus ingresos ${vIng > 0 ? "aumentaron" : "disminuyeron"} ${formatPct(Math.abs(vIng))} respecto al período anterior.`,
              calculo: `${money(previo.ingresos)} → ${money(actual.ingresos)}`,
            },
      );
    }
    const vEgr = variacionPct(actual.egresos, previo.egresos);
    if (!completos) {
      out.push({
        id: "tendencias_parciales",
        tono: "info",
        texto:
          "Hay movimientos sin cotización válida excluidos de los totales. Las variaciones y tendencias de abajo pueden no reflejar el negocio completo; actualiza las cotizaciones.",
        calculo: "Totales parciales",
      });
    }
    if (vEgr !== null && Math.abs(vEgr) >= UMBRAL_VARIACION_PCT) {
      out.push({
        id: vEgr > 0 ? "egresos_suben" : "egresos_bajan",
        tono: vEgr > 0 ? "alerta" : "positivo",
        texto: `Los gastos y costos ${vEgr > 0 ? "aumentaron" : "disminuyeron"} ${formatPct(Math.abs(vEgr))} respecto al período anterior.`,
        calculo: `${money(previo.egresos)} → ${money(actual.egresos)}`,
      });
    }
    const vGan = variacionPct(actual.ganancia, previo.ganancia);
    if (vGan !== null && Math.abs(vGan) >= UMBRAL_VARIACION_PCT) {
      out.push({
        id: vGan > 0 ? "ganancia_mayor" : "ganancia_menor",
        tono: vGan > 0 ? "positivo" : "alerta",
        texto:
          vGan > 0
            ? "El negocio está generando una ganancia mayor que en el período anterior."
            : "El negocio está generando una ganancia menor que en el período anterior.",
        calculo: `${money(previo.ganancia)} → ${money(actual.ganancia)} (${formatPct(vGan)})`,
      });
    }
    if (actual.margen !== null && previo.margen !== null) {
      const dif = actual.margen - previo.margen;
      if (Math.abs(dif) >= UMBRAL_MARGEN_PUNTOS) {
        out.push({
          id: dif > 0 ? "margen_mejora" : "margen_baja",
          tono: dif > 0 ? "positivo" : "alerta",
          texto: `Tu margen de ganancia ${dif > 0 ? "mejoró" : "disminuyó"} ${Math.abs(dif).toFixed(1)} puntos.`,
          calculo: `${formatPct(previo.margen)} → ${formatPct(actual.margen)}`,
        });
      }
    }
  }

  // Concentración de egresos (solo con al menos dos categorías).
  const top = categoriasEgreso[0];
  if (categoriasEgreso.length >= 2 && top && top.porcentaje >= UMBRAL_CONCENTRACION_PCT) {
    out.push({
      id: "concentracion_egresos",
      tono: "alerta",
      texto: `“${top.categoria}” concentra ${formatPct(top.porcentaje, 0)} de tus egresos. Revisar esa categoría tiene el mayor impacto.`,
      calculo: `${money(top.total)} de ${money(actual.egresos)}`,
    });
  }
  const topIng = categoriasIngreso[0];
  if (categoriasIngreso.length >= 2 && topIng) {
    out.push({
      id: "fuente_principal",
      tono: "neutral",
      texto: `Tu principal fuente de ingreso fue “${topIng.categoria}” (${formatPct(topIng.porcentaje, 0)} de lo que entra).`,
      calculo: `${money(topIng.total)} de ${money(actual.ingresos)}`,
    });
  }

  if (pendientes > 0) out.push(hallazgoPendientes(pendientes));
  return out;
}

function hallazgoPendientes(n: number): Hallazgo {
  return {
    id: "pendientes_conversion",
    tono: "info",
    texto: `${n} movimiento(s) en otra moneda no tienen cotización válida y no se incluyen en este análisis.`,
    calculo: `${n} excluido(s) de los totales`,
  };
}

function tienePendientes(r: ResumenPeriodo): boolean {
  return r.pendientesIngresos + r.pendientesEgresos > 0;
}

/** Atajo: resumen + interpretación de dos ventanas contiguas. */
export function diagnostico(
  txs: Transaction[],
  moneda: string,
  actual: { desde: string; hasta: string },
  previo: { desde: string; hasta: string },
) {
  const rActual = resumenPeriodo(txs, moneda, actual.desde, actual.hasta);
  const rPrevio = resumenPeriodo(txs, moneda, previo.desde, previo.hasta);
  const enRango = txs.filter((t) => t.fecha >= actual.desde && t.fecha <= actual.hasta);
  const hallazgos = interpretar({
    actual: rActual,
    previo: rPrevio,
    categoriasEgreso: totalesPorCategoria(enRango, moneda, ["gasto", "costo"]),
    categoriasIngreso: totalesPorCategoria(enRango, moneda, ["ingreso"]),
    totalesCompletos: !tienePendientes(rActual) && !tienePendientes(rPrevio),
  });
  if (tienePendientes(rPrevio) && !tienePendientes(rActual)) {
    hallazgos.push({
      id: "pendientes_conversion",
      tono: "info",
      texto: `El período anterior tiene ${rPrevio.pendientesIngresos + rPrevio.pendientesEgresos} movimiento(s) sin cotización válida excluidos: la comparación con el período actual es parcial.`,
      calculo: "Período anterior parcial",
    });
  }
  return { actual: rActual, previo: rPrevio, disponible: dineroDisponible(rActual), hallazgos };
}

// ---------------------------------------------------------------------------
// Distribución editable
// ---------------------------------------------------------------------------

export type CategoriaDistribucion = keyof Distribution;

export const CATEGORIAS_DISTRIBUCION: {
  key: CategoriaDistribucion;
  nombre: string;
  descripcion: string;
}[] = [
  {
    key: "operacion",
    nombre: "Capital operativo",
    descripcion: "Reserva para sostener la operación: costos, gastos fijos y próximos pagos.",
  },
  {
    key: "reinversion",
    nombre: "Reinversión",
    descripcion: "Dinero para hacer crecer el negocio: inventario, herramientas, marketing.",
  },
  {
    key: "ahorro",
    nombre: "Ahorro para metas futuras",
    descripcion: "Lo que apartas para tus metas de ahorro y tu fondo de emergencia.",
  },
];

export interface ValidacionDistribucion {
  valida: boolean;
  /** Suma de porcentajes. */
  total: number;
  /** 100 − total (≥ 0 si es válida): queda libre, sin asignar. */
  sinAsignar: number;
  errores: string[];
}

const EPS = 1e-9;

/** Porcentajes entre 0 y 100 cuya suma no supera 100. */
export function validarDistribucion(d: Distribution): ValidacionDistribucion {
  const errores: string[] = [];
  for (const c of CATEGORIAS_DISTRIBUCION) {
    const v = d[c.key];
    if (typeof v !== "number" || !Number.isFinite(v)) errores.push(`${c.nombre}: porcentaje inválido.`);
    else if (v < 0 || v > 100) errores.push(`${c.nombre}: el porcentaje debe estar entre 0 y 100.`);
  }
  const total = Math.round((d.operacion + d.reinversion + d.ahorro) * 100) / 100;
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
  operacion: number;
  reinversion: number;
  ahorro: number;
  sinAsignar: number;
  moneda: string;
}

/** Decimales del porcentaje interno: tres evitan pérdida de centavos al repartir. */
export const DECIMALES_PORCENTAJE = 3;

/**
 * Porcentaje (3 decimales) equivalente a un importe de la moneda principal,
 * redondeado a la unidad monetaria. Al repartir de nuevo se recupera el
 * mismo importe salvo un redondeo de ±1 unidad (ajustado en montosDistribucion).
 */
export function pctDe(digits: number) {
  const f = 10 ** digits;
  const k = 10 ** DECIMALES_PORCENTAJE;
  return (monto: number, base: number) => {
    if (!(base > 0)) return 0;
    const red = Math.round(monto * f) / f;
    if (red <= 0) return 0;
    // Hacia arriba: al repartir, el importe nunca queda por debajo del introducido.
    return Math.ceil(((red / base) * 100) * k - 1e-9) / k;
  };
}

/**
 * Importes de cada categoría sobre el dinero disponible, redondeados a los
 * decimales ISO de la moneda. La suma nunca supera el disponible: si el
 * redondeo la excede, el ajuste se descuenta de la categoría mayor.
 * Calcula los importes aunque la distribución no sea válida (suma > 100):
 * la interfaz necesita seguir mostrando los campos para que el usuario la
 * corrija. Devuelve null solo si el disponible no es un número finito ≥ 0.
 */
export function montosDistribucion(
  d: Distribution,
  disponible: number,
  moneda: string,
): MontosDistribucion | null {
  if (!Number.isFinite(disponible) || disponible < 0) return null;
  const digits = currencyDigits(moneda);
  const base = roundToCurrency(disponible, digits);
  const step = 1 / 10 ** digits;
  // Importe de una categoría: porcentaje → unidades monetarias redondeadas.
  const amount = (p: number) => Math.round(((base * p) / 100 / step)) * step;
  const keys = ["operacion", "reinversion", "ahorro"] as const;
  const montos = {
    operacion: amount(d.operacion),
    reinversion: amount(d.reinversion),
    ahorro: amount(d.ahorro),
  };
  let asignado = roundToCurrency(montos.operacion + montos.reinversion + montos.ahorro, digits);
  const pctTotal = d.operacion + d.reinversion + d.ahorro;
  const repartoCompleto = Math.abs(pctTotal - 100) < 1e-6;

  if (asignado > base && asignado > 0) {
    // Reparto que excede lo disponible (suma > 100 %, típico durante la
    // edición): se escala proporcionalmente redondeando hacia abajo, de
    // modo que nunca se supere el disponible ni queden importes negativos.
    const escala = base / asignado;
    for (const k of keys) {
      montos[k] = roundToCurrency(
        Math.floor(((montos[k] * escala) / step) + 1e-6) * step,
        digits,
      );
    }
    asignado = roundToCurrency(montos.operacion + montos.reinversion + montos.ahorro, digits);
    // El redondeo hacia abajo deja centavos: se completan en la categoría
    // mayor sin superar el disponible.
    const remanente = roundToCurrency(base - asignado, digits);
    if (remanente > 0) {
      const mayor = keys.reduce((a, b) => (montos[b] > montos[a] ? b : a));
      montos[mayor] = roundToCurrency(montos[mayor] + remanente, digits);
      asignado = roundToCurrency(asignado + remanente, digits);
    }
  } else if (repartoCompleto && base > asignado) {
    // Reparto del 100 %: el redondeo de centavos no debe dejar dinero sin
    // asignar; el remanente (unas pocas unidades como máximo) va a la
    // categoría mayor.
    const remanente = roundToCurrency(base - asignado, digits);
    const mayor = keys.reduce((a, b) => (montos[b] > montos[a] ? b : a));
    montos[mayor] = roundToCurrency(montos[mayor] + remanente, digits);
    asignado = roundToCurrency(asignado + remanente, digits);
  }

  return {
    ...montos,
    sinAsignar: roundToCurrency(Math.max(0, base - asignado), digits),
    moneda: moneda.toUpperCase(),
  };
}

