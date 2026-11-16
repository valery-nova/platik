import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BETA_KEY,
  DEMO_KEY,
  LEGACY_KEY,
  SCHEMA_VERSION,
  clearPlatik,
  dataKeyForMode,
  defaultPlatikData,
  readMode,
  readPlatik,
  writeMode,
  writePlatik,
  type StorageLike,
} from "../lib/storage";
import { migrateData } from "../lib/migration";
import { saldoDisponible } from "../lib/balance";
import {
  defaultDistributionForProfile,
  migrateDistributionCategories,
  sugerirDistribucion,
  validarDistribucion,
} from "../lib/distribution";
import type { Transaction } from "../lib/types";

function memoryStorage(): StorageLike & { dump(): Record<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    dump: () => Object.fromEntries(map),
  };
}

function tx(p: Partial<Transaction>): Transaction {
  return {
    id: p.id ?? "t1",
    tipo: p.tipo ?? "ingreso",
    monto: p.monto ?? 0,
    categoria: p.categoria ?? "Ventas",
    descripcion: p.descripcion ?? "demo",
    fecha: p.fecha ?? "2026-11-10",
    moneda: p.moneda ?? "BOB",
    ...p,
  };
}

test("DB-1: cada modalidad tiene su propia clave y no se mezclan", () => {
  const st = memoryStorage();
  assert.equal(dataKeyForMode("demo"), DEMO_KEY);
  assert.equal(dataKeyForMode("beta"), BETA_KEY);

  writeMode(st, "beta");
  assert.equal(readMode(st), "beta");

  const demo = defaultPlatikData("demo");
  const beta = defaultPlatikData("beta");
  assert.ok(demo.transactions.length > 0);
  assert.equal(beta.transactions.length, 0);
  assert.equal(beta.openingBalance, null);

  writePlatik(st, "demo", { version: SCHEMA_VERSION, data: demo, customized: true });
  writePlatik(st, "beta", { version: SCHEMA_VERSION, data: beta, customized: true });

  const demoLeer = readPlatik(st, "demo");
  const betaLeer = readPlatik(st, "beta");
  assert.ok(demoLeer);
  assert.ok(betaLeer);
  assert.ok(demoLeer!.data.transactions.length > 0);
  assert.equal(betaLeer!.data.transactions.length, 0);
  assert.equal(betaLeer!.data.openingBalance, null);
  assert.ok(st.dump()[DEMO_KEY]);
  assert.ok(st.dump()[BETA_KEY]);

  clearPlatik(st, "beta");
  assert.equal(readPlatik(st, "beta"), null);
  assert.ok(readPlatik(st, "demo"));
});

test("DB-2: la demo lee el legado platik:data:v1 solo como fallback", () => {
  const st = memoryStorage();
  const legacy = {
    data: {
      ...defaultPlatikData("demo"),
      customized: true,
    },
    customized: true,
  };
  st.setItem(LEGACY_KEY, JSON.stringify(legacy));
  const read = readPlatik(st, "demo");
  assert.ok(read);
  assert.equal(read!.customized, true);
  // Beta no hereda el legado.
  assert.equal(readPlatik(st, "beta"), null);
});

test("DB-3: migración de distribución antigua y nuevos campos", () => {
  const legacy = {
    transactions: [],
    goals: [],
    profile: { nombreNegocio: "X", nombreUsuario: "Y", moneda: "BOB" },
    distribution: { operacion: 55, reinversion: 25, ahorro: 20 },
  } as never;
  const data = migrateData(legacy);
  assert.equal(data.distribution.length, 3);
  assert.deepEqual(
    data.distribution.map((c) => [c.key, c.porcentaje]),
    [
      ["capital_operativo", 55],
      ["capital_crecimiento", 25],
      ["ahorro", 20],
    ],
  );
  assert.equal(data.openingBalance, null);
  assert.deepEqual(data.balanceAdjustments, []);
});

test("DB-4: saldo inicial y ajustes calculan el dinero disponible", () => {
  const base = {
    transactions: [tx({ tipo: "ingreso", monto: 1000 }), tx({ tipo: "gasto", monto: 300 })],
    openingBalance: null,
    balanceAdjustments: [],
  };
  // Sin saldo inicial: disponible = neto de movimientos.
  assert.equal(saldoDisponible(base, "BOB").monto, 700);

  const conSaldo = {
    ...base,
    openingBalance: {
      id: "o1",
      monto: 500,
      moneda: "BOB",
      fecha: "2026-11-01",
      descripcion: "Saldo de apertura",
    },
    balanceAdjustments: [
      {
        id: "a1",
        monto: 100,
        moneda: "BOB",
        fecha: "2026-11-02",
        descripcion: "Ajuste entrada",
      },
      {
        id: "a2",
        monto: -50,
        moneda: "BOB",
        fecha: "2026-11-03",
        descripcion: "Ajuste salida",
      },
    ],
  };
  // 500 + 100 - 50 + (1000 - 300) = 1250
  const s = saldoDisponible(conSaldo, "BOB");
  assert.equal(s.monto, 1250);
  assert.equal(s.saldoInicial, 500);
  assert.equal(s.ajustes, 50);
  assert.equal(s.netoMovimientos, 700);
});

test("DB-5: egreso sin cotización bloquea; ingreso pendiente es conservador", () => {
  const txs = [
    tx({ tipo: "ingreso", monto: 1000 }),
    tx({ tipo: "gasto", monto: 100, moneda: "USD" }),
    tx({ tipo: "ingreso", monto: 200, moneda: "EUR" }),
  ];
  const s = saldoDisponible(
    { transactions: txs, openingBalance: null, balanceAdjustments: [] },
    "BOB",
  );
  assert.equal(s.estado, "incompleto");
  assert.equal(s.monto, null);

  const soloIngresoPendiente = saldoDisponible(
    {
      transactions: [tx({ tipo: "ingreso", monto: 1000 }), tx({ tipo: "ingreso", monto: 200, moneda: "EUR" })],
      openingBalance: null,
      balanceAdjustments: [],
    },
    "BOB",
  );
  assert.equal(soloIngresoPendiente.estado, "parcial");
  assert.equal(soloIngresoPendiente.monto, 1000);
});

test("DB-6: perfiles tienen categorías iniciales válidas y recomendación transparente", () => {
  for (const tipo of ["independiente", "freelancer", "emprendedor", "empresa"] as const) {
    const d = defaultDistributionForProfile(tipo);
    assert.ok(d.length >= 5);
    assert.ok(validarDistribucion(d).valida);
    assert.equal(validarDistribucion(d).total, 100);
  }
  const prop = sugerirDistribucion({ tipoUsuario: "freelancer", disponible: 10000, moneda: "BOB" });
  assert.ok(prop.items.length > 0);
  assert.ok(prop.montos);
  assert.ok(prop.explicacion.some((e) => e.includes("reglas transparentes")));
  assert.ok(prop.explicacion.some((e) => e.includes("no da asesoría financiera personalizada")));
});

test("DB-7: migrateDistributionCategories acepta lista nueva y objeto antiguo", () => {
  const nuevo = migrateDistributionCategories([
    { key: "ahorro", porcentaje: 30 },
    { key: "capital_operativo", porcentaje: 70 },
    { key: "ahorro", porcentaje: 10 },
  ]);
  assert.deepEqual(
    nuevo.map((c) => [c.key, c.porcentaje]),
    [
      ["ahorro", 30],
      ["capital_operativo", 70],
    ],
  );
  assert.deepEqual(migrateDistributionCategories([]), []);
  const antiguo = migrateDistributionCategories({ operacion: 40, reinversion: 30, ahorro: 30 });
  assert.deepEqual(
    antiguo.map((c) => [c.key, c.porcentaje]),
    [
      ["capital_operativo", 40],
      ["capital_crecimiento", 30],
      ["ahorro", 30],
    ],
  );
});
