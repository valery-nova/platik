import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifyAdminSessionToken } from "@/lib/admin/auth";
import {
  getFounderMetrics,
  resolveAdminPeriod,
  sanitizeAdminFilters,
  type BreakdownItem,
  type EventMetric,
  type Funnel,
  type MetricStatus,
  type MetricValue,
  type Recording,
} from "@/lib/admin/metrics";
import { AdminActivityChart } from "@/components/admin-charts";
import { logout } from "./actions";

export const instant = false;

const numberFormat = new Intl.NumberFormat("es-BO");
const percentFormat = new Intl.NumberFormat("es-BO", { style: "percent", maximumFractionDigits: 1 });

function formatValue(metric: MetricValue): string {
  if (metric.status === "ok" && typeof metric.value === "number") return numberFormat.format(metric.value);
  if (metric.status === "pending_configuration") return "Pendiente";
  if (metric.status === "error") return "No disponible";
  return "—";
}

function Delta({ metric }: { metric: MetricValue }) {
  if (metric.status !== "ok" || typeof metric.value !== "number" || typeof metric.previousValue !== "number") return null;
  const diff = metric.value - metric.previousValue;
  if (metric.previousValue === 0) {
    return diff > 0 ? <p className="mt-1 text-xs font-medium text-menta-700">Nuevo frente al período anterior</p> : null;
  }
  const ratio = diff / metric.previousValue;
  const positive = diff >= 0;
  return (
    <p className={`mt-1 text-xs font-medium ${positive ? "text-menta-700" : "text-coral-600"}`}>
      {positive ? "+" : "−"}
      {numberFormat.format(Math.abs(diff))} ({percentFormat.format(Math.abs(ratio))}) vs período anterior
    </p>
  );
}

function Info({ text }: { text: string }) {
  return (
    <span
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-petroleo/20 text-[10px] font-bold text-tinta-suave"
      title={text}
      aria-label={text}
    >
      i
    </span>
  );
}

function StatusBadge({ status }: { status: MetricStatus }) {
  const styles = {
    ok: "bg-menta-100 text-menta-700",
    pending_configuration: "bg-lavanda-100 text-lavanda-600",
    error: "bg-coral-100 text-coral-600",
  } as const;
  const labels = { ok: "OK", pending_configuration: "Pendiente", error: "Error" } as const;
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
}

function MetricCard({
  label,
  metric,
  hint,
  showDelta = false,
}: {
  label: string;
  metric: MetricValue;
  hint?: string;
  showDelta?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-petroleo/10 bg-white p-4 shadow-[0_1px_3px_rgba(11,61,59,0.06)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-tinta-suave">{label}</p>
        {hint ? <Info text={hint} /> : null}
      </div>
      <p className="mt-2 text-2xl font-bold text-petroleo">{formatValue(metric)}</p>
      {showDelta ? <Delta metric={metric} /> : null}
      {metric.detail ? <p className="mt-1 text-xs text-tinta-suave">{metric.detail}</p> : null}
    </div>
  );
}

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-petroleo">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-tinta-suave">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-petroleo/10 bg-white p-4 shadow-[0_1px_3px_rgba(11,61,59,0.06)] ${className}`}>
      {children}
    </div>
  );
}

function Pending({ children = "Pendiente de configuración" }: { children?: React.ReactNode }) {
  return <Panel className="text-sm text-tinta-suave">{children}</Panel>;
}

function BreakdownList({ title, items, hint }: { title: string; items: BreakdownItem[] | null; hint?: string }) {
  const max = Math.max(1, ...(items ?? []).map((item) => item.count));
  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-petroleo">{title}</h3>
        {hint ? <Info text={hint} /> : null}
      </div>
      {items === null ? (
        <p className="text-sm text-tinta-suave">Pendiente de configuración o sin datos disponibles.</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-tinta-suave">Sin datos en el período seleccionado.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.name}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-tinta">{item.name}</span>
                <span className="text-tinta-suave">
                  {numberFormat.format(item.count)} · {numberFormat.format(item.users)} personas
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-petroleo-50">
                <div className="h-full rounded-full bg-menta-600" style={{ width: `${(item.count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

const FUNNEL_COLORS = ["#0b3d3b", "#35b183", "#8b66f6", "#f25565"];

function FunnelCard({ funnel, index }: { funnel: Funnel; index: number }) {
  const maxStarted = Math.max(1, ...funnel.steps.map((stage) => stage.started));
  return (
    <Panel>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-petroleo">{funnel.title}</h3>
        <StatusBadge status={funnel.status} />
      </div>
      <p className="mb-4 text-xs text-tinta-suave">{funnel.description}</p>
      {funnel.status !== "ok" ? (
        <p className="text-sm text-tinta-suave">{funnel.detail ?? "No disponible."}</p>
      ) : (
        <div className="space-y-3">
          {funnel.steps.map((stage, stepIndex) => {
            const color = FUNNEL_COLORS[(index + stepIndex) % FUNNEL_COLORS.length];
            return (
              <div key={stage.key} className="rounded-xl border border-petroleo/8 bg-marfil/60 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-tinta">{stage.label}</span>
                  <span className="text-tinta-suave">
                    {numberFormat.format(stage.started)} empiezan · {numberFormat.format(stage.completed)} completan
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full" style={{ width: `${(stage.started / maxStarted) * 100}%`, backgroundColor: color }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-tinta-suave">
                  <span>Conversión: {stage.conversion === null ? "—" : percentFormat.format(stage.conversion)}</span>
                  <span>Abandono: {stage.dropoff === null ? "—" : percentFormat.format(stage.dropoff)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function EventGrid({ events }: { events: EventMetric[] }) {
  const sorted = [...events].sort((a, b) => {
    if (a.status !== b.status) return a.status === "ok" ? -1 : 1;
    return b.count - a.count;
  });
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((event) => (
        <Panel key={event.event} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-petroleo">{event.label}</p>
              <p className="mt-0.5 text-xs text-tinta-suave">{event.event}</p>
            </div>
            <StatusBadge status={event.status} />
          </div>
          <p className="mt-3 text-2xl font-bold text-petroleo">
            {event.status === "ok" ? numberFormat.format(event.count) : "—"}
          </p>
          <p className="mt-1 text-xs text-tinta-suave">
            {event.status === "ok" ? `${numberFormat.format(event.users)} personas` : event.detail ?? "No disponible"}
          </p>
        </Panel>
      ))}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m} min ${s} s`;
}

function Recordings({ recordings, status, detail }: { recordings: Recording[] | null; status: MetricStatus; detail?: string }) {
  if (recordings === null) {
    return <Pending>{status === "pending_configuration" ? detail ?? "Pendiente de configuración" : detail ?? "No disponible"}</Pending>;
  }
  if (recordings.length === 0) {
    return <Pending>Sin grabaciones en el período seleccionado. Session Replay está enmascarado para no capturar datos sensibles.</Pending>;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {recordings.map((recording) => (
        <Panel key={recording.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-petroleo">{new Date(recording.startedAt).toLocaleString("es-BO")}</p>
              <p className="mt-0.5 text-xs text-tinta-suave">
                {formatDuration(recording.durationSeconds)} · {recording.startPath} · {recording.consoleErrors} errores de consola
              </p>
            </div>
            <StatusBadge status="ok" />
          </div>
          {recording.replayUrl ? (
            <a
              href={recording.replayUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm font-medium text-menta-700 hover:underline"
            >
              Abrir grabación en PostHog
            </a>
          ) : null}
        </Panel>
      ))}
    </div>
  );
}

export default async function AdminPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!verifyAdminSessionToken(token)) redirect("/admin/login");

  const searchParams = await props.searchParams;
  const period = resolveAdminPeriod(searchParams);
  const filters = sanitizeAdminFilters(searchParams);
  const metrics = await getFounderMetrics({ period, filters });

  const pageOptions = ["/", "/panel", "/panel/analisis", "/panel/transacciones", "/panel/metas", "/panel/perfil"];
  const currentPage = filters.page ?? "";
  const pageSelectOptions = currentPage && !pageOptions.includes(currentPage) ? [...pageOptions, currentPage] : pageOptions;
  const fromValue = metrics.period.from.slice(0, 10);
  const toValue = metrics.period.to.slice(0, 10);
  const topFeatures = metrics.events
    .filter((event) => event.event !== "page_view" && event.status === "ok")
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((event) => ({ name: event.label, count: event.count, users: event.users }));

  return (
    <main className="min-h-screen bg-marfil px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <header className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-menta-700">PLATIK Founder</p>
              <h1 className="mt-1 text-3xl font-bold text-petroleo">Founder Intelligence Center</h1>
              <p className="mt-1 max-w-2xl text-sm text-tinta-suave">
                {period.label} · actualizado {new Date(metrics.generatedAt).toLocaleString("es-BO")}. Solo métricas reales;
                lo no configurado se muestra como pendiente.
              </p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-xl border border-petroleo/15 bg-white px-4 py-2 text-sm font-medium text-petroleo hover:border-coral-500 hover:text-coral-600"
              >
                Salir
              </button>
            </form>
          </div>

          <nav className="flex flex-wrap gap-2 text-sm">
            {[
              ["overview", "Resumen"],
              ["producto", "Producto"],
              ["comportamiento", "Comportamiento"],
              ["embudos", "Embudos"],
              ["replay", "Replay"],
              ["rendimiento", "Rendimiento"],
              ["integraciones", "Integraciones"],
            ].map(([href, label]) => (
              <Link key={href} href={`#${href}`} className="rounded-full border border-petroleo/10 bg-white px-3 py-1 text-petroleo hover:border-menta-600 hover:text-menta-700">
                {label}
              </Link>
            ))}
          </nav>

          <Panel className="p-4">
            <form method="get" action="/admin" className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-medium text-tinta-suave">
                Período
                <select name="period" defaultValue={metrics.period.key} className="mt-1 block rounded-xl border border-petroleo/15 bg-white px-3 py-2 text-sm text-tinta">
                  <option value="24h">Últimas 24 horas</option>
                  <option value="7d">Últimos 7 días</option>
                  <option value="30d">Últimos 30 días</option>
                  <option value="90d">Últimos 90 días</option>
                  <option value="custom">Personalizado</option>
                </select>
              </label>
              <label className="text-xs font-medium text-tinta-suave">
                Desde
                <input type="date" name="from" defaultValue={fromValue} className="mt-1 block rounded-xl border border-petroleo/15 bg-white px-3 py-2 text-sm text-tinta" />
              </label>
              <label className="text-xs font-medium text-tinta-suave">
                Hasta
                <input type="date" name="to" defaultValue={toValue} className="mt-1 block rounded-xl border border-petroleo/15 bg-white px-3 py-2 text-sm text-tinta" />
              </label>
              <label className="text-xs font-medium text-tinta-suave">
                Página
                <select name="page" defaultValue={currentPage} className="mt-1 block rounded-xl border border-petroleo/15 bg-white px-3 py-2 text-sm text-tinta">
                  <option value="">Todas</option>
                  {pageSelectOptions.map((path) => (
                    <option key={path} value={path}>{path}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-tinta-suave">
                Dispositivo
                <select name="device" defaultValue={filters.device ?? ""} className="mt-1 block rounded-xl border border-petroleo/15 bg-white px-3 py-2 text-sm text-tinta">
                  <option value="">Todos</option>
                  <option value="desktop">Escritorio</option>
                  <option value="mobile">Móvil</option>
                  <option value="tablet">Tablet</option>
                </select>
              </label>
              <button type="submit" className="rounded-xl bg-petroleo px-4 py-2 text-sm font-medium text-white hover:bg-petroleo-800">
                Aplicar filtros
              </button>
              <button type="submit" name="refresh" value="1" className="rounded-xl border border-petroleo/15 bg-white px-4 py-2 text-sm font-medium text-petroleo hover:border-menta-600">
                Actualizar ahora
              </button>
            </form>
          </Panel>
        </header>

        <Section id="overview" title="A. Resumen" subtitle="Salud general de PLATIK en menos de 30 segundos.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Personas que visitaron" metric={metrics.overview.visitors} hint="Visitantes únicos medidos por Vercel Web Analytics en producción." showDelta />
            <MetricCard label="Páginas vistas" metric={metrics.overview.pageviews} hint="Pageviews automáticos de Vercel Web Analytics." showDelta />
            <MetricCard label="Usuarios activos" metric={metrics.overview.activeUsers} hint="Personas que generaron eventos en PLATIK durante el período (PostHog)." showDelta />
            <MetricCard label="Sesiones" metric={metrics.overview.sessions} hint="Sesiones distintas registradas por PostHog." showDelta />
            <MetricCard label="Usuarios activos hoy (DAU)" metric={metrics.overview.dau} hint="DAU: personas que utilizaron PLATIK durante el día." />
            <MetricCard label="Usuarios activos esta semana (WAU)" metric={metrics.overview.wau} hint="WAU: personas que utilizaron PLATIK durante los últimos 7 días." />
            <MetricCard label="Usuarios activos este mes (MAU)" metric={metrics.overview.mau} hint="MAU: personas que utilizaron PLATIK durante los últimos 30 días." />
            <MetricCard label="Conversión visitante → activo" metric={metrics.overview.visitorToActive} hint="Requiere usuarios identificados; PLATIK es anónimo por ahora." />
            <MetricCard label="Usuarios nuevos" metric={metrics.overview.newUsers} hint="Requiere identificación de usuarios; no se asume sin auth." />
            <MetricCard label="Usuarios recurrentes" metric={metrics.overview.returningUsers} hint="Requiere identificación de usuarios; no se asume sin auth." />
          </div>

          <Panel>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-petroleo">Actividad y crecimiento</h3>
              <Info text="Visitantes y páginas vistas vienen de Vercel Analytics; usuarios activos vienen de PostHog." />
            </div>
            {metrics.series === null ? (
              <Pending>Pendiente de configuración: faltan credenciales de PostHog y/o Vercel.</Pending>
            ) : metrics.series.length === 0 ? (
              <Pending>Sin actividad registrada en el período seleccionado.</Pending>
            ) : (
              <AdminActivityChart series={metrics.series} />
            )}
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownList title="Funcionalidades más utilizadas" items={topFeatures} hint="Eventos de producto ordenados por frecuencia en el período." />
            <Panel>
              <h3 className="mb-3 text-sm font-semibold text-petroleo">Actividad reciente</h3>
              {metrics.recentEvents === null ? (
                <p className="text-sm text-tinta-suave">Pendiente de configuración de PostHog.</p>
              ) : metrics.recentEvents.length === 0 ? (
                <p className="text-sm text-tinta-suave">Sin eventos recientes en el período.</p>
              ) : (
                <div className="space-y-2">
                  {metrics.recentEvents.map((event, index) => (
                    <div key={`${event.at}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-petroleo/8 bg-marfil/60 px-3 py-2 text-sm">
                      <span className="font-medium text-tinta">{event.label}</span>
                      <span className="text-right text-xs text-tinta-suave">
                        {event.path ?? ""} · {new Date(event.at).toLocaleString("es-BO")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </Section>

        <Section id="producto" title="B. Analítica de producto" subtitle="Qué funcionalidades usa la gente dentro de PLATIK.">
          <EventGrid events={metrics.events} />
        </Section>

        <Section id="comportamiento" title="C. Comportamiento" subtitle="Cómo navegan y desde dónde llegan las personas.">
          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownList title="Páginas más visitadas" items={metrics.behavior.topPages} hint="Rutas con más pageviews según Vercel Web Analytics." />
            <BreakdownList title="Páginas de entrada" items={metrics.behavior.entryPages} hint="Primera página de cada sesión según PostHog." />
            <BreakdownList title="Páginas de salida" items={metrics.behavior.exitPages} hint="Última página de cada sesión según PostHog." />
            <BreakdownList title="Dispositivos" items={metrics.behavior.devices} hint="Distribución por tipo de dispositivo." />
            <BreakdownList title="Países" items={metrics.behavior.countries} hint="Distribución por país según geo IP disponible." />
            <BreakdownList title="Navegadores" items={metrics.behavior.browsers} hint="Navegadores más utilizados." />
          </div>
        </Section>

        <Section id="embudos" title="D. Embudos de conversión" subtitle="Dónde avanzan y dónde abandonan las personas.">
          <div className="grid gap-4 lg:grid-cols-2">
            {metrics.funnels.map((funnel, index) => (
              <FunnelCard key={funnel.key} funnel={funnel} index={index} />
            ))}
          </div>
        </Section>

        <Section id="replay" title="E. Session Replay" subtitle="Grabaciones enmascaradas para observar la experiencia real.">
          <Recordings recordings={metrics.recordings} status={metrics.replayStatus} detail={metrics.replayDetail} />
        </Section>

        <Section id="rendimiento" title="F. Salud y velocidad de PLATIK" subtitle="Qué tan rápida y fluida es la experiencia.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Vercel Web Analytics" metric={metrics.performance.webAnalytics} hint="Visitantes y pageviews de producción." />
            <MetricCard label="Speed Insights" metric={metrics.performance.speedInsights} hint="Componente integrado; métricas en Vercel." />
            <MetricCard label="Core Web Vitals" metric={metrics.performance.coreWebVitals} hint="LCP, INP, CLS, FCP y TTFB se consultan en Speed Insights." />
          </div>
          <Panel className="text-sm text-tinta-suave">
            <p className="font-semibold text-petroleo">Cómo leer la velocidad</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>LCP: cuánto tarda en aparecer el contenido principal.</li>
              <li>INP: qué tan rápido responde PLATIK cuando alguien interactúa.</li>
              <li>CLS: cuánto se mueve inesperadamente el contenido de la pantalla.</li>
              <li>FCP: cuánto tarda en aparecer el primer contenido.</li>
              <li>TTFB: cuánto tarda el servidor en comenzar a responder.</li>
            </ul>
            <p className="mt-3">
              Speed Insights no expone una API REST pública para estos valores; se muestran como pendientes para no inventar datos.
            </p>
          </Panel>
        </Section>

        <Section id="integraciones" title="G. Integraciones" subtitle="Estado de las conexiones que alimentan el Command Center.">
          <div className="grid gap-3 md:grid-cols-3">
            {metrics.integrations.map((integration) => (
              <Panel key={integration.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-petroleo">{integration.name}</p>
                    <p className="mt-1 text-sm text-tinta-suave">{integration.detail}</p>
                  </div>
                  <StatusBadge status={integration.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {integration.metrics.map((metric) => (
                    <span key={metric} className="rounded-full bg-petroleo-50 px-2 py-0.5 text-xs text-petroleo-800">
                      {metric}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-tinta-suave">
                  Última sincronización: {integration.lastSync ? new Date(integration.lastSync).toLocaleString("es-BO") : "—"}
                </p>
                {integration.url ? (
                  <a href={integration.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-medium text-menta-700 hover:underline">
                    Abrir diagnóstico externo
                  </a>
                ) : null}
              </Panel>
            ))}
          </div>
        </Section>
      </div>
    </main>
  );
}
