# PLATIK — Tu copiloto financiero con IA

PLATIK es un copiloto financiero para personas, freelancers, emprendedores y pequeños negocios: ayuda a entender cuánto dinero entra y sale, a organizarlo en categorías y metas, y a ahorrar en dólares digitales (USDC sobre Stellar Testnet) sin exigir conocimiento de Web3.

**Estado actual**: aplicación web funcional en fase demo/beta. Todo corre en el navegador con `localStorage`; no hay backend, Supabase ni IA implementada todavía. Incluye modo demostración con datos de ejemplo y modo beta para empezar desde cero.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19
- TypeScript estricto
- Tailwind CSS v4 con tokens de marca en `app/globals.css`
- Recharts para gráficos y `lucide-react` para iconos
- Persistencia local en `localStorage` (sin backend)
- Stellar Testnet: `@stellar/stellar-sdk` (Horizon), `@stellar/varial-sdk` (wallet externa)
- Wallet integrada Pollar: `@pollar/react` + `@pollar/core` (Testnet)
- QR de recepción: `qrcode.react`
- Analítica de producto opcional: PostHog y Vercel Analytics/Speed Insights (no envía importes, balances ni datos de transacciones)

## Ejecutar

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

Rutas:

- `/` — landing pública con selector ES/EN, modo claro/oscuro e iconos sociales.
- `/panel` — dashboard con ingresos, costos, gastos, ganancia, dinero disponible y ahorro USDC confirmado.
- `/panel/transacciones` — registro y gestión de movimientos.
- `/panel/analisis` — análisis del periodo con lecturas y margen explicados.
- `/panel/metas` — metas de ahorro.
- `/panel/billetera` — wallet externa Stellar y wallet integrada Pollar.
- `/panel/perfil` — perfil, espacios, distribución, idioma, tema y modo demo/beta.

## Qué incluye hoy

- **Espacios financieros**: espacio Personal + hasta 2 emprendimientos, negocios o trabajos freelance. Cada espacio tiene sus propios ingresos, gastos, metas, distribución y billetera; cambiar de espacio no mezcla datos.
- **Transacciones**: ingresos, costos y gastos con categorías fijas o personalizadas, filtros por mes, año y rango de fechas, y equivalencias cuando hay cotización válida.
- **Análisis**: ingresos, costos, gastos, ganancia neta, margen, tendencias y lecturas en lenguaje simple.
- **Metas**: ahorro por objetivos en la moneda del espacio. Los aportes en moneda local son registros manuales; los depósitos USDC verificados on-chain pueden asignarse a una meta.
- **Billetera digital**: dos opciones en Stellar Testnet — conectar una wallet externa (Freighter/Varial) o crear una wallet integrada con Pollar (correo/Google). Permite recibir USDC con QR/dirección, activar trustline, enviar USDC y sincronizar depósitos verificados en Horizon. PLATIK nunca pide ni guarda claves privadas.
- **Perfil**: nombre, país, moneda principal/de visualización, distribución del dinero disponible por porcentajes o montos, cambio de idioma/tema y cambio entre modo demo y beta.
- **Landing**: propuesta de valor para cualquier persona, selector Español/English, modo claro/oscuro, enlaces a redes sociales y descarga de la app Android beta (APK).

## Variables de entorno

Ver `.env.example`. Las variables públicas son:

- `NEXT_PUBLIC_STELLAR_TESTNET_RECIPIENT` — dirección Stellar Testnet de referencia/legacy (opcional para los flujos actuales, que muestran la wallet del usuario).
- `NEXT_PUBLIC_FEEDBACK_URL` — enlace opcional del formulario de feedback.
- `NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY` — publishable key de Pollar Testnet para la wallet integrada.
- `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` / `NEXT_PUBLIC_POSTHOG_HOST` — analítica de producto opcional.

## Stellar Testnet / USDC

- Solo Testnet; no hay ruta a Mainnet ni dinero real.
- USDC de prueba de Circle: código `USDC`, emisor `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` ([docs de Circle](https://developers.circle.com/stablecoins/quickstarts/transfer-usdc-stellar)).
- Las wallets pueden ser externas (Freighter/Varial) o integradas (Pollar). En Testnet la wallet integrada la gestiona Pollar; PLATIK no ve claves privadas.
- Un depósito USDC solo cuenta cuando Horizon lo verifica; los depósitos confirmados se pueden asignar a metas.
- Para fondos de prueba: Friendbot para XLM, trustline USDC y Circle Faucet.

## Verificaciones

```bash
npm run lint              # ESLint
npm test                  # typecheck de tests + node --test
npm run build             # typecheck + build de producción
npm audit --omit=dev      # vulnerabilidades de dependencias de producción
```

## Estructura

```
app/                 Páginas (landing + panel) y layout raíz
app/panel/           Secciones del panel (dashboard, transacciones, análisis, metas, billetera, perfil)
components/          UI compartida, shell de navegación, gráficos y wallets
lib/                 Tipos, datos demo, store (contexto + localStorage), cálculos, i18n y preferencias
lib/stellar/         Integración Stellar Testnet (config, wallet, cuentas, trustline, pagos, depósitos, verificación)
lib/currency/        Catálogo ISO de países/monedas, decimales y cotizaciones
public/brand/        Assets oficiales de la marca (logos, mascota, isotipo)
```

## Hoja de ruta

- **Próximo** — persistencia real, modelo de datos y reglas financieras completas.
- **Después** — copiloto financiero con IA (explicaciones sobre tus propios datos).
