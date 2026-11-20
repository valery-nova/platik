"use client";

import { Languages, Moon, Sun } from "lucide-react";
import { usePreferences, type Lang } from "@/lib/preferences";

export function PreferenceToggles({ className = "" }: { className?: string }) {
  const { lang, setLang, theme, setTheme, t } = usePreferences();
  const label = lang === "es" ? "Español" : "English";

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="relative inline-flex items-center">
        <Languages size={14} className="pointer-events-none absolute left-2.5 text-petroleo/60 dark:text-white/60" aria-hidden="true" />
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          aria-label={t.prefs.language}
          title={t.prefs.language}
          className="h-9 cursor-pointer appearance-none rounded-full border border-petroleo/10 bg-white/80 pl-8 pr-7 text-xs font-semibold text-petroleo outline-none transition hover:border-petroleo/25 focus-visible:ring-2 focus-visible:ring-menta-600 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
        <span className="pointer-events-none absolute right-2.5 text-[10px] text-petroleo/50 dark:text-white/50" aria-hidden="true">▾</span>
        <span className="sr-only">{label}</span>
      </div>
      <button
        type="button"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label={theme === "dark" ? t.prefs.light : t.prefs.dark}
        title={theme === "dark" ? t.prefs.light : t.prefs.dark}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-petroleo/10 bg-white/80 text-petroleo transition hover:border-petroleo/25 hover:bg-menta-50 focus-visible:ring-2 focus-visible:ring-menta-600 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </div>
  );
}
