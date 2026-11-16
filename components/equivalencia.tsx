"use client";

/**
 * Equivalencias informativas en la moneda de visualización (`displayCurrency`).
 *
 * Reglas:
 * - La equivalencia nunca altera el saldo real: es solo lectura.
 * - Solo se muestra con cotización válida y vigente según la política de
 *   frescura; si no hay, se indica "sin cotización" en lugar de inventar
 *   un valor aproximado.
 * - El detalle (tipo de tasa, fuente, fechas) queda a un clic.
 */
import { useEffect, useState } from "react";
import { Info, RefreshCw } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { usePlatik } from "@/lib/store";
import { currencyDigits } from "@/lib/currency/catalog";
import { applyRate } from "@/lib/currency/decimal";
import { formatFecha, formatMoney } from "@/lib/format";
import { refrescarPendientes } from "@/lib/currency/refresh";
import { getRateService } from "@/lib/currency/service";
import type { QuoteFreshness } from "@/lib/currency/freshness";
import type { ExchangeRateQuote, RateType } from "@/lib/currency/rates";

export interface QuoteView {
  key: string;
  quote: ExchangeRateQuote | null;
  freshness: QuoteFreshness;
}

/** Cotización de `from` a `to` (compartida por caché del servicio). */
export function useQuote(from: string, to: string): QuoteView | null {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  const key = `${f}|${t}`;
  const [view, setView] = useState<QuoteView | null>(null);

  useEffect(() => {
    if (f === t) return;
    let cancelled = false;
    getRateService()
      .quote(f, t)
      .then((r) => {
        if (!cancelled) setView({ key, quote: r.quote, freshness: r.freshness });
      })
      .catch(() => {
        if (!cancelled)
          setView({ key, quote: null, freshness: "no_disponible" });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, t]);

  if (!view || view.key !== key) return null;
  return view;
}

const TIPO_TASA_LABEL: Record<RateType, string> = {
  reference: "Referencia",
  mid: "Tipo medio",
  buy: "Compra",
  sell: "Venta",
  executable: "Ejecutable",
};

function formatoFechaHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleString("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Detalle accesible de la cotización utilizada (modal). */
function DetalleCotizacion({
  open,
  onClose,
  quote,
  freshness,
}: {
  open: boolean;
  onClose: () => void;
  quote: ExchangeRateQuote;
  freshness: QuoteFreshness;
}) {
  const tipo = quote.rateType ?? "reference";
  return (
    <Modal open={open} onClose={onClose} title="Detalle de la cotización">
      <dl className="space-y-2.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-tinta-suave">Par</dt>
          <dd className="font-medium text-tinta">
            {quote.from} → {quote.to}
            {quote.viaCurrency ? ` (cruzada vía ${quote.viaCurrency})` : ""}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-tinta-suave">Tasa</dt>
          <dd className="font-medium text-tinta">{quote.rate}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-tinta-suave">Tipo de tasa</dt>
          <dd className="font-medium text-tinta">{TIPO_TASA_LABEL[tipo]}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-tinta-suave">Fuente</dt>
          <dd className="text-right font-medium text-tinta">
            {quote.providerName}
            {quote.underlyingProviders && quote.underlyingProviders.length > 0 && (
              <span className="block text-xs font-normal text-tinta-suave">
                Origen: {quote.underlyingProviders.join(", ")}
              </span>
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-tinta-suave">Fecha del dato</dt>
          <dd className="font-medium text-tinta">
            {quote.publishedAt ? formatFecha(quote.publishedAt) : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-tinta-suave">Consultado</dt>
          <dd className="font-medium text-tinta">{formatoFechaHora(quote.fetchedAt)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-tinta-suave">Estado</dt>
          <dd className="font-medium text-tinta">
            {freshness === "anterior_vigente"
              ? "Último valor publicado (último día hábil)"
              : "Cotización vigente"}
          </dd>
        </div>
      </dl>
      <p className="mt-4 rounded-xl bg-lavanda-50 px-3.5 py-2.5 text-xs text-lavanda-600">
        Es una equivalencia informativa de referencia: no es un precio de
        compra o venta ni una cotización ejecutable.
      </p>
    </Modal>
  );
}

/**
 * Equivalencia informativa de `monto` (en `moneda`) hacia `displayMoneda`.
 * No altera el importe original; solo lo acompaña visualmente.
 */
export function EquivalenciaSecundaria({
  monto,
  moneda,
  displayMoneda,
  compact = false,
}: {
  monto: number;
  moneda: string;
  displayMoneda?: string;
  /** En compacto no se muestra el detalle ni el estado vacío. */
  compact?: boolean;
}) {
  const [detalle, setDetalle] = useState(false);
  const view = useQuote(moneda, displayMoneda ?? "");

  const from = moneda.toUpperCase();
  const to = (displayMoneda ?? "").toUpperCase();
  if (!to || to === from) return null;
  if (!view) return null; // cargando: no se muestra nada para no inventar

  const quote = view.quote;
  const usable =
    quote !== null &&
    quote.status === "valid" &&
    (view.freshness === "vigente" || view.freshness === "anterior_vigente");

  if (!usable || !quote) {
    if (compact) {
      return (
        <span className="text-[10px] text-tinta-suave/70">≈ sin cotización</span>
      );
    }
    return (
      <span className="text-xs text-tinta-suave">
        Equivalencia no disponible: sin cotización válida ({to}).
      </span>
    );
  }

  const equivalente = applyRate(monto, quote.rate, currencyDigits(to));

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-tinta-suave">
      <span>
        ≈ <span className="font-semibold text-tinta">{formatMoney(equivalente, to)}</span>
      </span>
      <button
        type="button"
        onClick={() => setDetalle(true)}
        aria-label="Ver detalle de la cotización"
        className="rounded-full p-0.5 text-tinta-suave hover:bg-petroleo-50 hover:text-petroleo"
      >
        <Info size={12} />
      </button>
      {detalle && (
        <DetalleCotizacion
          open={detalle}
          onClose={() => setDetalle(false)}
          quote={quote}
          freshness={view.freshness}
        />
      )}
    </span>
  );
}

/**
 * Botón para reintentar la conversión de movimientos pendientes cuando
 * haya cotizaciones válidas. Nunca sobrescribe snapshots históricos.
 */
export function BotonActualizarCotizaciones() {
  const { data, hydrated, updateTransaction } = usePlatik();
  const [estado, setEstado] = useState<"inactivo" | "cargando" | "ok" | "error">(
    "inactivo",
  );
  const [mensaje, setMensaje] = useState("");

  async function actualizar() {
    if (!hydrated || estado === "cargando") return;
    setEstado("cargando");
    setMensaje("Buscando cotizaciones…");
    try {
      const res = await refrescarPendientes(
        data.transactions,
        data.profile.moneda,
        getRateService(),
      );
      for (const tx of res.actualizados) updateTransaction(tx);
      setEstado("ok");
      setMensaje(
        res.convertidos > 0
          ? `${res.convertidos} movimiento(s) actualizado(s) con cotización válida. ${res.pendientes} siguen pendiente(s).`
          : `No hay cotización válida disponible todavía. ${res.pendientes} movimiento(s) pendiente(s).`,
      );
    } catch {
      setEstado("error");
      setMensaje("No se pudieron consultar las cotizaciones. Inténtalo de nuevo.");
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        className="!px-3 !py-1.5 text-xs"
        onClick={() => void actualizar()}
        disabled={estado === "cargando"}
      >
        <RefreshCw size={13} className={estado === "cargando" ? "animate-spin" : ""} />
        {estado === "cargando" ? "Buscando…" : "Actualizar cotizaciones"}
      </Button>
      {mensaje && (
        <span
          className={`text-xs ${estado === "error" ? "text-coral-600" : "text-tinta-suave"}`}
          role="status"
        >
          {mensaje}
        </span>
      )}
    </span>
  );
}
