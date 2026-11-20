export type UiLocale = "es" | "en";

let current: UiLocale = "es";

export function setUiLocale(locale: UiLocale) {
  current = locale;
}

/** Idioma activo de la UI (es/en). */
export function uiLang(): UiLocale {
  return current;
}

/** Locale para Intl.NumberFormat/DateTimeFormat (monedas y fechas cortas). */
export function uiIntlLocale(): string {
  return current === "en" ? "en" : "es";
}

/** Locale regional para toLocaleString/toLocaleDateString. */
export function uiLocaleTag(): string {
  return current === "en" ? "en-US" : "es-BO";
}
