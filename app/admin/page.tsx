import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifyAdminSessionToken } from "@/lib/admin/auth";
import { getAdminMetrics, type MetricValue } from "@/lib/admin/metrics";
import { logout } from "./actions";

export const instant = false;
const numberFormat = new Intl.NumberFormat("es-BO");

function formatValue(metric: MetricValue): string {
  if (metric.status === "ok" && typeof metric.value === "number") {
    return numberFormat.format(metric.value);
  }
  if (metric.status === "pending_configuration") return "Pendiente de configuración";
  return "No disponible";
}

function Metric({ label, metric }: { label: string; metric: MetricValue }) {
  return (
    <div className="rounded-2xl border border-petroleo/10 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-tinta-suave">{label}</p>
      <p className="mt-2 text-2xl font-bold text-petroleo">{formatValue(metric)}</p>
      {metric.detail ? <p className="mt-1 text-xs text-tinta-suave">{metric.detail}</p> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-petroleo">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminPage() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!verifyAdminSessionToken(token)) redirect("/admin/login");

  const metrics = await getAdminMetrics();
  const posthogUrl = metrics.posthog.appUrl ?? "https://us.posthog.com";
  const recentActivity = metrics.activitySeries?.slice(-14) ?? null;

  return (
    <main className="min-h-screen bg-marfil px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-menta-700">PLATIK Founder</p>
            <h1 className="mt-1 text-3xl font-bold text-petroleo">Command Center</h1>
            <p className="mt-1 text-sm text-tinta-suave">
              Generado {new Date(metrics.generatedAt).toLocaleString("es-BO")}. Solo métricas reales;
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
        </header>

        <Section title="7.7 Integraciones">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-petroleo/10 bg-white p-4">
              <p className="font-semibold text-petroleo">PostHog</p>
              <p className="mt-1 text-sm text-tinta-suave">
                {metrics.posthog.configured ? "Product Analytics configurado" : "Pendiente de configuración"}
              </p>
              <a className="mt-2 inline-block text-sm font-medium text-menta-700 hover:underline" href={posthogUrl} target="_blank" rel="noreferrer">
                Abrir PostHog
              </a>
            </div>
            <div className="rounded-2xl border border-petroleo/10 bg-white p-4">
              <p className="font-semibold text-petroleo">Vercel Analytics</p>
              <p className="mt-1 text-sm text-tinta-suave">Componente integrado; métricas en el dashboard de Vercel.</p>
              <a className="mt-2 inline-block text-sm font-medium text-menta-700 hover:underline" href="https://vercel.com/dashboard" target="_blank" rel="noreferrer">
                Abrir Vercel
              </a>
            </div>
            <div className="rounded-2xl border border-petroleo/10 bg-white p-4">
              <p className="font-semibold text-petroleo">Speed Insights</p>
              <p className="mt-1 text-sm text-tinta-suave">Componente integrado; Core Web Vitals en el dashboard de Vercel.</p>
              <a className="mt-2 inline-block text-sm font-medium text-menta-700 hover:underline" href="https://vercel.com/dashboard" target="_blank" rel="noreferrer">
                Abrir Vercel
              </a>
            </div>
          </div>
        </Section>

        <Section title="7.1 Overview">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Visitantes únicos (30d)" metric={metrics.overview.uniqueVisitors} />
            <Metric label="Pageviews (30d)" metric={metrics.overview.pageViews} />
            <Metric label="DAU" metric={metrics.overview.dau} />
            <Metric label="WAU" metric={metrics.overview.wau} />
            <Metric label="MAU" metric={metrics.overview.mau} />
            <Metric label="Sesiones" metric={metrics.overview.sessions} />
            <Metric label="Usuarios nuevos" metric={metrics.overview.newUsers} />
            <Metric label="Usuarios recurrentes" metric={metrics.overview.returningUsers} />
            <Metric label="Conversión visitante → activo" metric={metrics.overview.visitorToActive} />
          </div>
        </Section>

        <Section title="7.2 Evolución de actividad">
          {recentActivity === null ? (
            <div className="rounded-2xl border border-petroleo/10 bg-white p-4 text-sm text-tinta-suave">
              Pendiente de configuración: define las credenciales privadas de PostHog para ver la serie diaria.
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="rounded-2xl border border-petroleo/10 bg-white p-4 text-sm text-tinta-suave">
              Sin actividad registrada en los últimos 30 días.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-petroleo/10 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-petroleo-50 text-left text-tinta-suave">
                  <tr>
                    <th className="px-4 py-2 font-medium">Día</th>
                    <th className="px-4 py-2 font-medium">Usuarios activos</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((point) => (
                    <tr key={point.day} className="border-t border-petroleo/6">
                      <td className="px-4 py-2">{point.day}</td>
                      <td className="px-4 py-2 font-medium text-petroleo">{numberFormat.format(point.users)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="7.3 Product Analytics">
          <div className="overflow-x-auto rounded-2xl border border-petroleo/10 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-petroleo-50 text-left text-tinta-suave">
                <tr>
                  <th className="px-4 py-2 font-medium">Evento</th>
                  <th className="px-4 py-2 font-medium">Conteo 30d</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {metrics.productEvents.map((event) => (
                  <tr key={event.event} className="border-t border-petroleo/6">
                    <td className="px-4 py-2 font-mono text-xs">{event.event}</td>
                    <td className="px-4 py-2 font-medium text-petroleo">
                      {event.status === "ok" && typeof event.value === "number" ? numberFormat.format(event.value) : "—"}
                    </td>
                    <td className="px-4 py-2 text-tinta-suave">
                      {event.status === "ok" ? "OK" : event.status === "pending_configuration" ? "Pendiente" : "Error"}
                      {event.detail ? ` · ${event.detail}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="7.4 Conversion Funnels">
          <Metric label="Embudo" metric={metrics.funnels} />
        </Section>

        <Section title="7.5 Session Replay">
          <Metric label="Grabaciones" metric={metrics.replay} />
        </Section>

        <Section title="7.6 Performance">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Vercel Web Analytics" metric={metrics.performance.webAnalytics} />
            <Metric label="Speed Insights" metric={metrics.performance.speedInsights} />
            <Metric label="Core Web Vitals" metric={metrics.performance.coreWebVitals} />
          </div>
        </Section>
      </div>
    </main>
  );
}
