export type MetricStatus = "ok" | "pending_configuration" | "error";

export interface MetricValue {
  status: MetricStatus;
  value?: number;
  detail?: string;
}

export interface ProductEventMetric {
  event: string;
  status: MetricStatus;
  value?: number;
  detail?: string;
}

export interface ActivityPoint {
  day: string;
  users: number;
}

export interface AdminMetrics {
  generatedAt: string;
  posthog: {
    configured: boolean;
    appUrl: string | null;
    projectId: string | null;
  };
  overview: {
    uniqueVisitors: MetricValue;
    pageViews: MetricValue;
    dau: MetricValue;
    wau: MetricValue;
    mau: MetricValue;
    sessions: MetricValue;
    newUsers: MetricValue;
    returningUsers: MetricValue;
    visitorToActive: MetricValue;
  };
  activitySeries: ActivityPoint[] | null;
  productEvents: ProductEventMetric[];
  funnels: MetricValue;
  replay: MetricValue;
  performance: {
    webAnalytics: MetricValue;
    speedInsights: MetricValue;
    coreWebVitals: MetricValue;
  };
}

const PRODUCT_EVENTS = [
  "page_view",
  "demo_started",
  "dashboard_viewed",
  "analysis_viewed",
  "onboarding_started",
  "onboarding_completed",
  "income_created",
  "expense_created",
  "transaction_created",
  "transaction_failed",
  "category_selected",
  "goal_created",
  "goal_contribution_started",
  "goal_contribution_completed",
  "wallet_connect_clicked",
  "wallet_connected",
  "usdc_deposit_started",
  "usdc_deposit_completed",
  "feature_error",
] as const;

interface PostHogConfig {
  apiKey: string;
  projectId: string;
  apiHost: string;
}

function defaultPostHogApiHost(): string {
  const ingest = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "";
  if (ingest.includes("eu.i.posthog.com")) return "https://eu.posthog.com";
  return "https://us.posthog.com";
}

function postHogConfig(): PostHogConfig | null {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY?.trim();
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim();
  const apiHost = (process.env.POSTHOG_API_HOST?.trim() || defaultPostHogApiHost()).replace(/\/+$/, "");
  if (!apiKey || !projectId || !apiHost) return null;
  return { apiKey, projectId, apiHost };
}

async function postHogRequest(config: PostHogConfig, query: string): Promise<unknown> {
  const response = await fetch(`${config.apiHost}/api/projects/${config.projectId}/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`PostHog respondió ${response.status}`);
  return response.json();
}

function toNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function extractScalar(data: unknown): number | null {
  const rows = (data as { results?: unknown })?.results;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = rows[0];
  if (Array.isArray(row)) return toNumber(row[0]);
  if (row && typeof row === "object") {
    for (const value of Object.values(row as Record<string, unknown>)) {
      const n = toNumber(value);
      if (n !== null) return n;
    }
    return null;
  }
  return toNumber(row);
}

function extractRows(data: unknown): Array<Array<unknown>> {
  const rows = (data as { results?: unknown })?.results;
  return Array.isArray(rows) ? rows.filter((row): row is Array<unknown> => Array.isArray(row)) : [];
}

function pending(detail: string): MetricValue {
  return { status: "pending_configuration", detail };
}

function errorMetric(detail: string): MetricValue {
  return { status: "error", detail };
}

async function scalarMetric(
  config: PostHogConfig | null,
  query: string,
  missingDetail: string,
): Promise<MetricValue> {
  if (!config) return pending(missingDetail);
  try {
    const value = extractScalar(await postHogRequest(config, query));
    if (value === null) return errorMetric("La consulta no devolvió un número");
    return { status: "ok", value };
  } catch (err) {
    return errorMetric(err instanceof Error ? err.message : "Error consultando PostHog");
  }
}

async function loadActivitySeries(config: PostHogConfig | null): Promise<ActivityPoint[] | null> {
  if (!config) return null;
  try {
    const data = await postHogRequest(
      config,
      "SELECT toDate(timestamp) AS day, count(DISTINCT distinct_id) AS users FROM events WHERE timestamp >= now() - INTERVAL 30 DAY GROUP BY day ORDER BY day ASC",
    );
    return extractRows(data)
      .map((row) => ({ day: String(row[0] ?? ""), users: toNumber(row[1]) ?? 0 }))
      .filter((point) => point.day);
  } catch {
    return null;
  }
}

async function loadProductEvents(config: PostHogConfig | null): Promise<ProductEventMetric[]> {
  if (!config) {
    return PRODUCT_EVENTS.map((event) => ({
      event,
      status: "pending_configuration" as const,
      detail: "Configura POSTHOG_PERSONAL_API_KEY y POSTHOG_PROJECT_ID",
    }));
  }
  const list = PRODUCT_EVENTS.map((event) => `'${event}'`).join(", ");
  try {
    const data = await postHogRequest(
      config,
      `SELECT event, count() AS count FROM events WHERE timestamp >= now() - INTERVAL 30 DAY AND event IN (${list}) GROUP BY event`,
    );
    const counts = new Map<string, number>();
    for (const row of extractRows(data)) {
      const event = String(row[0] ?? "");
      const count = toNumber(row[1]);
      if (event && count !== null) counts.set(event, count);
    }
    return PRODUCT_EVENTS.map((event) => ({
      event,
      status: "ok" as const,
      value: counts.get(event) ?? 0,
    }));
  } catch (err) {
    return PRODUCT_EVENTS.map((event) => ({
      event,
      status: "error" as const,
      detail: err instanceof Error ? err.message : "Error consultando PostHog",
    }));
  }
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const config = postHogConfig();
  const missing = "Configura POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID y POSTHOG_API_HOST";
  const [uniqueVisitors, pageViews, dau, wau, mau, activitySeries, productEvents] =
    await Promise.all([
      scalarMetric(config, "SELECT count(DISTINCT distinct_id) AS value FROM events WHERE timestamp >= now() - INTERVAL 30 DAY", missing),
      scalarMetric(config, "SELECT count() AS value FROM events WHERE event = 'page_view' AND timestamp >= now() - INTERVAL 30 DAY", missing),
      scalarMetric(config, "SELECT count(DISTINCT distinct_id) AS value FROM events WHERE timestamp >= now() - INTERVAL 1 DAY", missing),
      scalarMetric(config, "SELECT count(DISTINCT distinct_id) AS value FROM events WHERE timestamp >= now() - INTERVAL 7 DAY", missing),
      scalarMetric(config, "SELECT count(DISTINCT distinct_id) AS value FROM events WHERE timestamp >= now() - INTERVAL 30 DAY", missing),
      loadActivitySeries(config),
      loadProductEvents(config),
    ]);

  return {
    generatedAt: new Date().toISOString(),
    posthog: {
      configured: Boolean(config),
      appUrl: config?.apiHost ?? null,
      projectId: config?.projectId ?? null,
    },
    overview: {
      uniqueVisitors,
      pageViews,
      dau,
      wau,
      mau,
      sessions: pending("Las sesiones se consultan en el dashboard de PostHog"),
      newUsers: pending("PLATIK es anónimo; la identificación de usuarios nuevos requiere auth"),
      returningUsers: pending("PLATIK es anónimo; la identificación de usuarios recurrentes requiere auth"),
      visitorToActive: pending("Requiere definir ‘activo’ y usuarios identificados"),
    },
    activitySeries,
    productEvents,
    funnels: pending("Configura embudos en PostHog; PLATIK no calcula embudos estrictos todavía"),
    replay: pending("Session Replay está enmascarado; ábrelo desde PostHog"),
    performance: {
      webAnalytics: pending("Vercel Web Analytics se consulta en el dashboard de Vercel"),
      speedInsights: pending("Vercel Speed Insights se consulta en el dashboard de Vercel"),
      coreWebVitals: pending("Core Web Vitals se consulta en Vercel Speed Insights"),
    },
  };
}
