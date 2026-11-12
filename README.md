# PLATIK — Tu copiloto financiero con IA

PLATIK ayuda a emprendedores, freelancers y pequeños negocios a
entender cuánto dinero gana realmente su negocio, controlar ingresos y gastos, y
ahorrar en dólares digitales (USDC sobre la red Stellar).

**Estado actual**: web funcional con datos de demostración + aportes reales de
USDC de prueba en **Stellar Testnet** firmados con la wallet Varial (antes
Freighter). Sin IA ni Supabase todavía.

## Stack

- Next.js (App Router) + React 19
- TypeScript estricto
- Tailwind CSS v4 (tokens de marca en `app/globals.css`)
- Recharts (gráficos) · lucide-react (iconos)
- Persistencia de demostración en `localStorage` (sin backend)
- `@stellar/stellar-sdk` (Horizon Testnet) · `@stellar/varial-sdk` (wallet)

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
lib/stellar/    Integración Stellar Testnet (config, wallet, cuentas, trustline, pagos, verificación)
public/brand/   Assets oficiales de la marca (logo, isotipo, ajolote)
```

## Stellar Testnet (ahorro on-chain)

Sección **Ahorro on-chain** en `/panel/metas`. Solo opera en **Testnet**; no
existe ninguna ruta a Mainnet.

- **Activo**: USDC de prueba de Circle — código `USDC`, emisor
  `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`
  ([docs de Circle](https://developers.circle.com/stablecoins/quickstarts/transfer-usdc-stellar)).
  Sin valor monetario real.
- **Receptor**: variable `NEXT_PUBLIC_STELLAR_TESTNET_RECIPIENT` (dirección
  pública `G…` de Testnet, con trustline USDC). Sin ella los aportes quedan
  deshabilitados. Ver `.env.example`.
- **Custodia**: ninguna. El usuario firma desde su propia wallet; PLATIK nunca
  pide ni guarda claves privadas, frases semilla ni XDR firmado.
- **Confirmación**: un aporte solo pasa a “confirmada” cuando Horizon devuelve
  la transacción como exitosa (fecha y ledger reales).

Preparar una wallet de prueba:

1. Instalar la extensión [Varial / Freighter](https://www.freighter.app/) y
   cambiar la red a **Testnet**.
2. Activar la cuenta con XLM de prueba en
   [Friendbot](https://friendbot.stellar.org) (enlace directo en la app).
3. Crear la trustline USDC desde la app (botón “Crear trustline USDC”).
4. Pedir USDC de prueba en el [Circle Faucet](https://faucet.circle.com/)
   (Stellar Testnet, 20 USDC cada 2 h por dirección).

Estados de un aporte: `preparado` → `firma_solicitada` → `enviada` →
`confirmada` | `fallida` | `cancelada`. Los aportes `enviada` se reverifican en
Horizon al recargar.

## Notas de la fase 1

- Todos los datos son **ficticios** y están identificados como demostración en la UI.
- Los cambios (transacciones, metas, perfil) se guardan en `localStorage` del
  navegador; “Restablecer demo” en Perfil vuelve a los datos iniciales.
- Los cálculos financieros viven en `lib/finance.ts` como funciones puras y
  deterministas (la UI nunca inventa cifras).
- Las metas en Bs son registros internos; los aportes on-chain en USDC de
  prueba se muestran aparte y no se suman a las metas en Bs.

## Hoja de ruta

- **Próximo** — persistencia real, modelo de datos y reglas financieras completas.
- **Después** — copiloto financiero con IA (explicaciones sobre tus propios datos).
