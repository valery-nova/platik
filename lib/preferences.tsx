"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "es" | "en";
export type Theme = "light" | "dark";

const THEME_KEY = "platik:theme:v1";
const LANG_KEY = "platik:lang:v1";

const es: Dict = {
  nav: {
    panel: "Panel",
    transacciones: "Transacciones",
    analisis: "Análisis",
    metas: "Metas",
    billetera: "Billetera",
    perfil: "Perfil",
  },
  shell: {
    tagline: "Tu copiloto financiero con IA",
    beta: "Estás en la prueba beta de PLATIK (72 horas). Te informaremos el tiempo restante por separado; los datos se guardan solo en este navegador.",
    menu: "Abrir menú",
    close: "Cerrar menú",
    home: "Ir a la portada",
  },
  badges: {
    demo: "Datos de demostración",
    beta: "Prueba beta · 72 h",
  },
  prefs: {
    language: "Idioma",
    theme: "Tema",
    spanish: "Español",
    english: "English",
    light: "Modo claro",
    dark: "Modo oscuro",
  },
} as const;

type Dict = {
  nav: Record<"panel" | "transacciones" | "analisis" | "metas" | "billetera" | "perfil", string>;
  shell: { tagline: string; beta: string; menu: string; close: string; home: string };
  badges: { demo: string; beta: string };
  prefs: { language: string; theme: string; spanish: string; english: string; light: string; dark: string };
};

const en: Dict = {
  nav: {
    panel: "Dashboard",
    transacciones: "Transactions",
    analisis: "Insights",
    metas: "Goals",
    billetera: "Wallet",
    perfil: "Profile",
  },
  shell: {
    tagline: "Your AI financial copilot",
    beta: "You are in the PLATIK beta (72 hours). We will inform you of the remaining time separately; data is stored only in this browser.",
    menu: "Open menu",
    close: "Close menu",
    home: "Go to home",
  },
  badges: {
    demo: "Demo data",
    beta: "Beta · 72 h",
  },
  prefs: {
    language: "Language",
    theme: "Theme",
    spanish: "Español",
    english: "English",
    light: "Light mode",
    dark: "Dark mode",
  },
};

const DICT: Record<Lang, Dict> = { es, en };

interface Preferences {
  lang: Lang;
  setLang: (lang: Lang) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: Dict;
}

const PreferencesContext = createContext<Preferences | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  // Inicialización perezosa: en SSR siempre "es"/"light"; en el cliente se
  // leen las preferencias guardadas (el script inline ya aplicó el tema).
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "es";
    try {
      const saved = window.localStorage.getItem(LANG_KEY);
      return saved === "en" ? "en" : "es";
    } catch {
      return "es";
    }
  });
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    try {
      return window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem(LANG_KEY, lang);
    } catch {
      // noop
    }
  }, [lang]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // noop
    }
  }, [theme]);

  const value = useMemo<Preferences>(
    () => ({ lang, setLang, theme, setTheme, t: DICT[lang] }),
    [lang, theme],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): Preferences {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences debe usarse dentro de PreferencesProvider");
  return ctx;
}
