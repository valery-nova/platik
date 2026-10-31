import type { PlatikData, Transaction } from "./types";
import { haceDiasISO, hoyISO } from "./finance";

let seq = 0;
function tx(
  tipo: Transaction["tipo"],
  monto: number,
  categoria: string,
  descripcion: string,
  haceDias: number,
): Transaction {
  seq += 1;
  return {
    id: `demo-${seq}`,
    tipo,
    monto,
    categoria,
    descripcion,
    fecha: haceDiasISO(haceDias),
  };
}

/**
 * Datos ficticios de demostración para un pequeño negocio boliviano.
 * Siempre se identifican como demostración en la UI.
 */
export function buildDemoData(): PlatikData {
  seq = 0;
  return {
    profile: {
      nombreNegocio: "Artesanías La Chamba",
      nombreUsuario: "Valeria",
      moneda: "BOB",
    },
    distribution: { operacion: 55, reinversion: 25, ahorro: 20 },
    transactions: [
      // ————— hace ~3 meses
      tx("ingreso", 5200, "Ventas", "Ventas feria del mes", 96),
      tx("ingreso", 1800, "Trabajo freelance", "Diseño de logo para cliente", 90),
      tx("costo", 2100, "Mercadería / insumos", "Compra de cerámica y textiles", 94),
      tx("gasto", 950, "Alquiler", "Alquiler del taller", 92),
      tx("gasto", 320, "Servicios básicos", "Luz y agua", 88),
      tx("gasto", 400, "Marketing", "Publicidad en redes", 85),
      tx("ingreso", 2600, "Ventas", "Pedidos en línea", 82),
      // ————— hace ~2 meses
      tx("ingreso", 6400, "Ventas", "Ventas feria del mes", 64),
      tx("ingreso", 1500, "Servicios", "Taller de cerámica para turistas", 58),
      tx("costo", 2600, "Mercadería / insumos", "Reposición de inventario", 62),
      tx("costo", 380, "Envíos", "Envíos a Cochabamba", 55),
      tx("gasto", 950, "Alquiler", "Alquiler del taller", 60),
      tx("gasto", 340, "Servicios básicos", "Luz, agua e internet", 52),
      tx("gasto", 500, "Marketing", "Campaña mes del padre", 48),
      tx("gasto", 450, "Impuestos", "Impuestos mensuales", 45),
      tx("ingreso", 2100, "Ventas", "Ventas de fin de mes", 42),
      // ————— mes pasado
      tx("ingreso", 7100, "Ventas", "Ventas feria del mes", 32),
      tx("ingreso", 2400, "Trabajo freelance", "Catálogo de productos", 28),
      tx("costo", 2900, "Mercadería / insumos", "Compra de materiales", 34),
      tx("costo", 300, "Comisiones de venta", "Comisión pasarela de pagos", 30),
      tx("gasto", 950, "Alquiler", "Alquiler del taller", 29),
      tx("gasto", 380, "Servicios básicos", "Luz, agua e internet", 25),
      tx("gasto", 650, "Marketing", "Ads para temporada", 22),
      tx("gasto", 1200, "Sueldos y honorarios", "Ayudante medio tiempo", 20),
      tx("ingreso", 1800, "Ventas", "Ventas de fin de mes", 16),
      // ————— este mes
      tx("ingreso", 3600, "Ventas", "Ventas primera quincena", 9),
      tx("ingreso", 900, "Servicios", "Taller privado", 6),
      tx("costo", 1400, "Mercadería / insumos", "Insumos para pedidos", 11),
      tx("gasto", 950, "Alquiler", "Alquiler del taller", 8),
      tx("gasto", 300, "Marketing", "Promoción del mes", 5),
      tx("gasto", 210, "Transporte", "Fletes y envíos", 3),
      tx("ingreso", 750, "Ventas", "Ventas fin de semana", 1),
    ],
    goals: [
      {
        id: "goal-1",
        nombre: "Fondo de emergencia",
        montoObjetivo: 10000,
        ahorroAcumulado: 3250,
        fechaObjetivo: hoyISO(
          new Date(new Date().getFullYear(), new Date().getMonth() + 5, 1),
        ),
      },
      {
        id: "goal-2",
        nombre: "Nuevo horno de cerámica",
        montoObjetivo: 6500,
        ahorroAcumulado: 1800,
      },
      {
        id: "goal-3",
        nombre: "Ahorro en dólares digitales (USDC)",
        montoObjetivo: 1500,
        ahorroAcumulado: 240,
      },
    ],
  };
}
