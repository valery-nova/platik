"use client";

import { useState } from "react";
import { Globe2, Landmark, PiggyBank } from "lucide-react";
import { Button, Card, Field, Select } from "@/components/ui";
import { usePlatik } from "@/lib/store";
import {
  countryName,
  currencyName,
  listCountries,
  listCurrencies,
  suggestedCurrenciesForCountry,
} from "@/lib/currency/catalog";
import type { Profile } from "@/lib/types";

type Opcion = "bolivia" | "usd" | "world";

const OPCIONES: {
  id: Opcion;
  titulo: string;
  descripcion: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "bolivia",
    titulo: "Bolivia",
    descripcion: "Boliviano (BOB) como moneda principal, con equivalencias en USD.",
    icon: <Landmark size={22} />,
  },
  {
    id: "usd",
    titulo: "USD",
    descripcion: "Dólares para freelancers internacionales, sin exigir residencia en EE. UU.",
    icon: <PiggyBank size={22} />,
  },
  {
    id: "world",
    titulo: "Resto del mundo",
    descripcion: "Elige tu país y tu moneda habitual del catálogo internacional.",
    icon: <Globe2 size={22} />,
  },
];

/**
 * Onboarding de moneda: 3 modalidades iniciales y configuración de país,
 * moneda principal y moneda de visualización. No limita la arquitectura a
 * Bolivia, USD o una lista cerrada: el catálogo es ISO completo.
 */
export function OnboardingMoneda() {
  const { data, hydrated, updateProfile } = usePlatik();
  const [opcion, setOpcion] = useState<Opcion | null>(null);
  const [countryCode, setCountryCode] = useState("");
  const [moneda, setMoneda] = useState("");
  const [displayCurrency, setDisplayCurrency] = useState("");

  if (!hydrated || data.profile.onboardingDone) return null;

  const profile = data.profile;

  function elegir(o: Opcion) {
    setOpcion(o);
    if (o === "bolivia") {
      setCountryCode("BO");
      setMoneda("BOB");
    } else if (o === "usd") {
      setCountryCode("");
      setMoneda("USD");
    } else {
      setCountryCode("");
      setMoneda("");
    }
    setDisplayCurrency("");
  }

  function cambiarPais(code: string) {
    setCountryCode(code);
    const sugerida = suggestedCurrenciesForCountry(code)[0];
    if (sugerida) setMoneda(sugerida);
  }

  function guardar() {
    const next: Profile = {
      ...profile,
      countryCode: countryCode || undefined,
      moneda: moneda || profile.moneda || "BOB",
      displayCurrency: displayCurrency || undefined,
      onboardingOption: opcion ?? profile.onboardingOption,
      currencyPreference:
        opcion === "bolivia" ? "local" : opcion === "usd" ? "usd" : "custom",
      onboardingDone: true,
    };
    updateProfile(next);
  }

  const puedeGuardar = Boolean(moneda);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-petroleo/60 p-4 backdrop-blur-sm">
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <h2 className="text-xl font-bold text-petroleo">¿Cómo manejas tu dinero?</h2>
        <p className="mt-1 text-sm text-tinta-suave">
          Elige una opción para empezar. Podrás cambiarla cuando quieras en Perfil.
        </p>

        {!opcion ? (
          <div className="mt-5 grid gap-3">
            {OPCIONES.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => elegir(o.id)}
                className="flex items-start gap-3 rounded-2xl border border-petroleo/15 p-4 text-left transition-colors hover:border-menta-600 hover:bg-menta-50"
              >
                <span className="mt-0.5 text-menta-700">{o.icon}</span>
                <span>
                  <span className="block font-semibold text-petroleo">{o.titulo}</span>
                  <span className="mt-0.5 block text-sm text-tinta-suave">{o.descripcion}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="País">
                <Select value={countryCode} onChange={(e) => cambiarPais(e.target.value)}>
                  <option value="">Sin especificar</option>
                  {listCountries().map((c) => (
                    <option key={c.code} value={c.code}>
                      {countryName(c.code)} ({c.code})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Moneda principal">
                <Select value={moneda} onChange={(e) => setMoneda(e.target.value)}>
                  <option value="">Elige una moneda</option>
                  {listCurrencies().map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} · {currencyName(c.code)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field
              label="Moneda de visualización"
              hint="Opcional. Solo cambia cómo se muestran los montos, nunca los valores."
            >
              <Select value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value)}>
                <option value="">Igual que la principal</option>
                {listCurrencies()
                  .filter((c) => c.code !== moneda)
                  .map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} · {currencyName(c.code)}
                    </option>
                  ))}
              </Select>
            </Field>
            <div className="flex justify-between gap-2 pt-1">
              <Button variant="ghost" onClick={() => setOpcion(null)}>
                Atrás
              </Button>
              <Button variant="accent" disabled={!puedeGuardar} onClick={guardar}>
                Comenzar
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
