# PLATIK — Tu copiloto financiero con IA

PLATIK ayuda a emprendedores, freelancers y pequeños negocios de Bolivia a
entender cuánto dinero gana realmente su negocio, controlar ingresos y gastos, y
ahorrar en dólares digitales (USDC sobre la red Stellar).

**Estado actual: Fase 1** — web funcional con datos de demostración. Sin IA,
Supabase ni blockchain todavía (ver hoja de ruta abajo).

## Stack

- Next.js (App Router) + React 19
- TypeScript estricto
- Tailwind CSS v4 (tokens de marca en `app/globals.css`)
- Recharts (gráficos) · lucide-react (iconos)
- Persistencia de demostración en `localStorage` (sin backend)

## Ejecutar el proyecto

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

- `/` — landing pública
- `/panel` — dashboard financiero
- `/panel/transacciones` — registro y gestión de movimientos
- `/panel/analisis` — análisis del periodo con explicaciones simples
- `/panel/metas` — metas de ahorro
- `/panel/perfil` — perfil, moneda y distribución del dinero

## Verificaciones

```bash
npm run lint    # ESLint
npm run build   # typecheck + build de producción
```

## Estructura

```
app/            Páginas (landing + panel) y layout raíz
app/panel/      Secciones del panel (dashboard, transacciones, análisis, metas, perfil)
components/     UI compartida, shell de navegación y gráficos
lib/            Tipos, datos demo, store (contexto + localStorage) y cálculos
public/brand/   Assets oficiales de la marca (logo, isotipo, ajolote)
```

## Notas de la fase 1

- Todos los datos son **ficticios** y están identificados como demostración en la UI.
- Los cambios (transacciones, metas, perfil) se guardan en `localStorage` del
  navegador; “Restablecer demo” en Perfil vuelve a los datos iniciales.
- Los cálculos financieros viven en `lib/finance.ts` como funciones puras y
  deterministas (la UI nunca inventa cifras).
- Las metas de ahorro son registros internos: **no** representan fondos en una
  blockchain todavía.

## Hoja de ruta

- **Fase 2** — persistencia real, modelo de datos y reglas financieras completas.
- **Fase 3** — copiloto financiero con IA (explicaciones sobre tus propios datos).
- **Fase 4** — ahorro en USDC con Stellar Testnet + Freighter.
