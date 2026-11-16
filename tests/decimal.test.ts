import { test } from "node:test";
import assert from "node:assert/strict";
import { applyRate, roundToCurrency, sumAmounts } from "../lib/currency/decimal";

test("sumAmounts evita el polvo de punto flotante", () => {
  // 0.1 + 0.2 debe ser exactamente 0.3, no 0.30000000000000004.
  assert.equal(sumAmounts([0.1, 0.2], 2), 0.3);
  // Cada importe se redondea a los decimales de la moneda antes de sumar.
  assert.equal(sumAmounts([1.005, 2.005], 2), 3.02);
  assert.equal(sumAmounts([1.25, 2.75], 2), 4);
});

test("roundToCurrency redondea half-up a los decimales de la moneda", () => {
  assert.equal(roundToCurrency(1.005, 2), 1.01);
  assert.equal(roundToCurrency(1.004, 2), 1);
  assert.equal(roundToCurrency(123.456, 0), 123);
  assert.equal(roundToCurrency(123.456, 3), 123.456);
});

test("applyRate convierte con redondeo half-up sin perder precisión", () => {
  // 100 USD * 6.91 BOB/USD = 691 BOB.
  assert.equal(applyRate(100, 6.91, 2), 691);
  // 1 BOB * 0.144927 USD/BOB = 0.14 USD (2 decimales).
  assert.equal(applyRate(1, 0.144927, 2), 0.14);
  // Tasa con muchos decimales se respeta hasta el redondeo final.
  assert.equal(applyRate(3, 1 / 3, 2), 1);
});

test("acepta notación exponencial de Number sin lanzar excepciones", () => {
  // 0.0000001 se serializa como "1e-7": debe expandirse, no romper el parser.
  assert.equal(roundToCurrency(0.0000001, 7), 0.0000001);
  assert.equal(roundToCurrency(0.0000001, 0), 0);
  assert.equal(roundToCurrency(1.23e-7, 8), 0.00000012);
  assert.equal(roundToCurrency(-1e-7, 7), -0.0000001);
  // 1e21 excede el entero seguro de JS y se rechaza por diseño; probamos un
  // entero grande dentro de rango.
  assert.equal(roundToCurrency(123456789.126, 2), 123456789.13);
  assert.equal(sumAmounts([1e-7, 2e-7], 7), 0.0000003);
});

test("applyRate rechaza valores no finitos", () => {
  assert.throws(() => applyRate(Number.NaN, 1, 2));
  assert.throws(() => applyRate(1, Number.POSITIVE_INFINITY, 2));
});
