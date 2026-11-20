/**
 * Catálogo internacional de monedas (ISO 4217) y países (ISO 3166-1).
 * Los datos viven en catalog-data.ts (generados desde fuentes ISO);
 * aquí solo hay consultas. Añadir una moneda o país nuevo es editar el
 * dataset, nunca la lógica de negocio.
 */
import {
  COUNTRY_CATALOG,
  CURRENCY_CATALOG,
  type CountryInfo,
  type CurrencyInfo,
} from "./catalog-data";

export type { CountryInfo, CurrencyInfo };

import { uiIntlLocale } from "../locale";

const CURRENCIES_BY_CODE = new Map(CURRENCY_CATALOG.map((c) => [c.code, c]));
const COUNTRIES_BY_CODE = new Map(COUNTRY_CATALOG.map((c) => [c.code, c]));

/** Código ISO 4217 válido según el catálogo. */
export function isCurrencyCode(code: string | undefined | null): code is string {
  return !!code && CURRENCIES_BY_CODE.has(code.toUpperCase());
}

/** Código ISO 3166-1 alpha-2 válido según el catálogo. */
export function isCountryCode(code: string | undefined | null): code is string {
  return !!code && COUNTRIES_BY_CODE.has(code.toUpperCase());
}

/** Devuelve la ficha de la moneda o undefined si no existe. */
export function getCurrency(code: string): CurrencyInfo | undefined {
  return CURRENCIES_BY_CODE.get(code.toUpperCase());
}

/** Decimales ISO de la moneda; 2 si el código es desconocido. */
export function currencyDigits(code: string): number {
  return CURRENCIES_BY_CODE.get(code.toUpperCase())?.digits ?? 2;
}

/**
 * Paso mínimo de un input numérico para la moneda ("0.01", "0.001", "1"…)
 * según sus decimales ISO. Evita que el navegador rechace importes válidos
 * de monedas con 3 o 4 decimales o exija centavos en monedas sin ellos.
 */
export function currencyStep(code: string): string {
  const d = currencyDigits(code);
  if (d <= 0) return "1";
  return `0.${"0".repeat(d - 1)}1`;
}

/** Todas las monedas del catálogo, ordenadas por código. */
export function listCurrencies(): CurrencyInfo[] {
  return CURRENCY_CATALOG;
}

/** Devuelve la ficha del país o undefined si no existe. */
export function getCountry(code: string): CountryInfo | undefined {
  return COUNTRIES_BY_CODE.get(code.toUpperCase());
}

/** Todos los países del catálogo, ordenados por código. */
export function listCountries(): CountryInfo[] {
  return COUNTRY_CATALOG;
}

/**
 * Monedas sugeridas para un país (ISO 3166-1 alpha-2), en orden de
 * preferencia. Vacío si el país no tiene moneda conocida o no existe:
 * el usuario siempre puede elegir manualmente.
 */
export function suggestedCurrenciesForCountry(countryCode: string): string[] {
  return getCountry(countryCode)?.currencies ?? [];
}

/** Primera moneda sugerida para el país, o null si no hay sugerencia. */
export function suggestedCurrencyForCountry(countryCode: string): string | null {
  return suggestedCurrenciesForCountry(countryCode)[0] ?? null;
}

const currencyDisplayNames = new Map<string, string>();
const countryDisplayNames = new Map<string, string>();

function displayNames(type: "currency" | "region"): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames([uiIntlLocale()], { type });
  } catch {
    return null;
  }
}

/** Nombre localizado (es) de la moneda; respaldo: nombre ISO en inglés. */
export function currencyName(code: string): string {
  const key = code.toUpperCase();
  const cacheKey = `${uiIntlLocale()}|${key}`;
  const cached = currencyDisplayNames.get(cacheKey);
  if (cached) return cached;
  const info = CURRENCIES_BY_CODE.get(key);
  let name = info?.name ?? key;
  const dn = displayNames("currency");
  if (dn) {
    try {
      name = dn.of(key) ?? name;
    } catch {
      // Intl no reconoce el código: se conserva el nombre del catálogo.
    }
  }
  currencyDisplayNames.set(cacheKey, name);
  return name;
}

/** Nombre localizado (es) del país; respaldo: el código alpha-2. */
export function countryName(code: string): string {
  const key = code.toUpperCase();
  const cacheKey = `${uiIntlLocale()}|${key}`;
  const cached = countryDisplayNames.get(cacheKey);
  if (cached) return cached;
  let name = key;
  const dn = displayNames("region");
  if (dn) {
    try {
      name = dn.of(key) ?? name;
    } catch {
      // Código no reconocido por Intl: se muestra el código.
    }
  }
  countryDisplayNames.set(cacheKey, name);
  return name;
}
