import {
  vercelConfig,
  vercelDimensionFilter,
  vercelVisitsAggregate,
  vercelVisitsCount,
} from "./vercel";

export type MetricStatus = "ok" | "pending_configuration" | "error";

export interface MetricValue {
  status: MetricStatus;
  value?: number;
  previousValue?: number;
  detail?: string;
}

export interface AdminPeriod {
  key: string;
  label: string;
  granularity: "hour" | "day";
  since: Date;
  until: Date;
  previousSince: Date;
  previousUntil: Date;
}

export interface AdminFilters {
  page?: string;
  device?: "desktop" | "mobile" | "tablet";
  refresh?: boolean;
}

export interface SeriesPoint {
  key: string;
  label: string;
  visitors: number | null;
  pageviews: number | null;
  activeUsers: number | null;
}

export interface BreakdownItem {
  name: string;
  count: number;
  users: number;
}

export interface RecentEvent {
  at: string;
  event: string;
  label: string;
  path: string | null;
}

export interface EventMetric {
  event: string;
  label: string;
  count: number;
  users: number;
  status: MetricStatus;
  detail?: string;
}

export interface FunnelStage {
  key: string;
  label: string;
  started: number;
  completed: number;
  conversion: number | null;
  dropoff: number | null;
}

export interface Funnel {
  key: string;
  title: string;
  description: string;
  steps: FunnelStage[];
  status: MetricStatus;
  detail?: string;
}

export interface Recording {
  id: string;
  startedAt: string;
  durationSeconds: number;
  startPath: string;
  consoleErrors: number;
  replayUrl: string | null;
}

export interface Integration {
  id: string;
  name: string;
  status: MetricStatus;
  detail: string;
  metrics: string[];
  url: string | null;
  lastSync: string | null;
}

export interface FounderMetrics {
  generatedAt: string;
  period: {
    key: string;
    label: string;
    granularity: "hour" | "day";
    from: string;
    to: string;
  };
  filters: {
    page: string | null;
    device: string | null;
  };
  posthog: {
    configured: boolean;
    appUrl: string | null;
    projectId: string | null;
  };
  vercel: {
    configured: boolean;
    projectId: string | null;
  };
  overview: {
    visitors: MetricValue;
    pageviews: MetricValue;
    activeUsers: MetricValue;
    sessions: MetricValue;
    dau: MetricValue;
    wau: MetricValue;
    mau: MetricValue;
    newUsers: MetricValue;
    returningUsers: MetricValue;
    visitorToActive: MetricValue;
  };
  series: SeriesPoint[] | null;
  recentEvents: RecentEvent[] | null;
  behavior: {
    topPages: BreakdownItem[] | null;
    entryPages: BreakdownItem[] | null;
    exitPages: BreakdownItem[] | null;
    devices: BreakdownItem[] | null;
    countries: BreakdownItem[] | null;
    browsers: BreakdownItem[] | null;
    socialNetworks: BreakdownItem[] | null;
    status: MetricStatus;
    detail?: string;
  };
  events: EventMetric[];
  funnels: Funnel[];
  recordings: Recording[] | null;
  replayStatus: MetricStatus;
  replayDetail?: string;
  integrations: Integration[];
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
  "social_link_click",
  "feature_error",
] as const;

const EVENT_LABELS: Record<string, string> = {
  page_view: "Vista de página",
  demo_started: "Inicio de demostración",
  dashboard_viewed: "Panel visto",
  analysis_viewed: "Análisis visto",
  onboarding_started: "Onboarding iniciado",
  onboarding_completed: "Onboarding completado",
  income_created: "Creación de ingresos",
  expense_created: "Registro de gastos",
  transaction_created: "Transacción creada",
  transaction_failed: "Error en transacción",
  category_selected: "Categoría seleccionada",
  goal_created: "Meta creada",
  goal_contribution_started: "Aporte a meta iniciado",
  goal_contribution_completed: "Aporte a meta completado",
  wallet_connect_clicked: "Conexión de billetera iniciada",
  wallet_connected: "Billetera conectada",
  usdc_deposit_started: "Depósito USDC iniciado",
  usdc_deposit_completed: "Depósito USDC completado",
  social_link_click: "Click en red social",
  feature_error: "Error de funcionalidad",
};

const FUNNEL_DEFS = [
  {
    key: "visit_to_demo",
    title: "De visita a demostración",
    description: "Personas que llegaron a PLATIK y iniciaron la demostración.",
    steps: ["page_view", "demo_started"],
  },
  {
    key: "demo_to_dashboard",
    title: "De demostración a onboarding completado",
    description: "Recorrido desde iniciar la demo hasta completar el onboarding.",
    steps: ["demo_started", "onboarding_started", "onboarding_completed"],
  },
  {
    key: "wallet_connect",
    title: "Conexión de billetera",
    description: "Personas que iniciaron y completaron la conexión de wallet.",
    steps: ["wallet_connect_clicked", "wallet_connected"],
  },
  {
    key: "usdc_deposit",
    title: "Depósito USDC",
    description: "Personas que iniciaron y completaron un depósito USDC de prueba.",
    steps: ["usdc_deposit_started", "usdc_deposit_completed"],
  },
] as const;

interface PostHogConfig {
  apiKey: string;
  projectId: string;
  apiHost: string;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function resolveAdminPeriod(searchParams: Record<string, string | string[] | undefined>): AdminPeriod {
  const now = new Date();
  const key = first(searchParams.period) ?? "30d";
  const durations: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };
  let since: Date;
  let until = now;
  let granularity: "hour" | "day" = key === "24h" ? "hour" : "day";
  if (key === "custom") {
    const from = first(searchParams.from);
    const to = first(searchParams.to);
    const parsedFrom = from ? new Date(`${from}T00:00:00.000Z`) : null;
    const parsedTo = to ? new Date(`${to}T23:59:59.999Z`) : null;
    if (parsedFrom && parsedTo && !Number.isNaN(parsedFrom.getTime()) && !Number.isNaN(parsedTo.getTime()) && parsedTo > parsedFrom) {
      since = parsedFrom;
      until = parsedTo;
      granularity = parsedTo.getTime() - parsedFrom.getTime() <= 2 * 24 * 60 * 60 * 1000 ? "hour" : "day";
    } else {
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  } else {
    const days = durations[key] ?? 30;
    since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }
  const duration = Math.max(1, until.getTime() - since.getTime());
  const previousUntil = new Date(since.getTime());
  const previousSince = new Date(since.getTime() - duration);
  const labels: Record<string, string> = {
    "24h": "Últimas 24 horas",
    "7d": "Últimos 7 días",
    "30d": "Últimos 30 días",
    "90d": "Últimos 90 días",
    custom: "Período personalizado",
  };
  return { key, label: labels[key] ?? labels["30d"], granularity, since, until, previousSince, previousUntil };
}

export function sanitizeAdminFilters(searchParams: Record<string, string | string[] | undefined>): AdminFilters {
  const pageRaw = first(searchParams.page)?.trim();
  const deviceRaw = first(searchParams.device)?.trim();
  const page = pageRaw && /^\/[A-Za-z0-9\-._~/%]*$/.test(pageRaw) && pageRaw.length <= 200 ? pageRaw : undefined;
  const device = deviceRaw === "desktop" || deviceRaw === "mobile" || deviceRaw === "tablet" ? deviceRaw : undefined;
  const refresh = first(searchParams.refresh) === "1";
  return { page, device, refresh };
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
    body: JSON.stringify({ query: { kind: "HogQLQuery", query }, refresh: "force_blocking" }),
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

function sec(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

function timeSql(column: string, since: Date, until: Date): string {
  return `${column} >= fromUnixTimestamp(${sec(since)}) AND ${column} <= fromUnixTimestamp(${sec(until)})`;
}

function posthogDevice(device: AdminFilters["device"]): string | null {
  if (device === "desktop") return "Desktop";
  if (device === "mobile") return "Mobile";
  if (device === "tablet") return "Tablet";
  return null;
}

function eventFiltersSql(filters: AdminFilters): string {
  const parts: string[] = [];
  if (filters.page) parts.push(`properties.$pathname = '${filters.page}'`);
  const device = posthogDevice(filters.device);
  if (device) parts.push(`properties.$device_type = '${device}'`);
  return parts.length ? `AND ${parts.join(" AND ")}` : "";
}

function pending(detail: string): MetricValue {
  return { status: "pending_configuration", detail };
}

function errorMetric(detail: string): MetricValue {
  return { status: "error", detail };
}

async function scalarQuery(config: PostHogConfig, query: string): Promise<number | null> {
  return extractScalar(await postHogRequest(config, query));
}

async function comparisonMetric(
  config: PostHogConfig | null,
  currentQuery: string,
  previousQuery: string,
  missingDetail: string,
): Promise<MetricValue> {
  if (!config) return pending(missingDetail);
  try {
    const [value, previousValue] = await Promise.all([
      scalarQuery(config, currentQuery),
      scalarQuery(config, previousQuery).catch(() => null),
    ]);
    if (value === null) return errorMetric("La consulta no devolvió un número");
    return { status: "ok", value, previousValue: previousValue ?? undefined };
  } catch (err) {
    return errorMetric(err instanceof Error ? err.message : "Error consultando PostHog");
  }
}

async function vercelCountMetric(
  since: Date,
  until: Date,
  previousSince: Date,
  previousUntil: Date,
  filter: string | undefined,
  pick: "visitors" | "pageviews",
  missingDetail: string,
): Promise<MetricValue> {
  if (!vercelConfig()) return pending(missingDetail);
  try {
    const [current, previous] = await Promise.all([
      vercelVisitsCount(since, until, filter),
      vercelVisitsCount(previousSince, previousUntil, filter).catch(() => null),
    ]);
    return {
      status: "ok",
      value: current[pick],
      previousValue: previous ? previous[pick] : undefined,
    };
  } catch (err) {
    return errorMetric(err instanceof Error ? err.message : "Error consultando Vercel");
  }
}

function fixedMetricQuery(days: number, filters: AdminFilters): string {
  const base = `SELECT count(DISTINCT distinct_id) AS value FROM events WHERE timestamp >= now() - INTERVAL ${days} DAY ${eventFiltersSql(filters)}`;
  return base;
}

async function loadPostHogSeries(
  config: PostHogConfig | null,
  period: AdminPeriod,
  filters: AdminFilters,
): Promise<Map<string, { activeUsers: number; pageviews: number }> | null> {
  if (!config) return null;
  const bucketFn = period.granularity === "hour" ? "toStartOfHour(timestamp)" : "toStartOfDay(timestamp)";
  try {
    const rows = extractRows(
      await postHogRequest(
        config,
        `SELECT toUnixTimestamp(${bucketFn}) AS bucket, count(DISTINCT distinct_id) AS active_users, countIf(event = 'page_view') AS pageviews FROM events WHERE ${timeSql("timestamp", period.since, period.until)} ${eventFiltersSql(filters)} GROUP BY bucket ORDER BY bucket ASC`,
      ),
    );
    const map = new Map<string, { activeUsers: number; pageviews: number }>();
    for (const row of rows) {
      const unix = toNumber(row[0]);
      if (unix === null) continue;
      map.set(new Date(unix * 1000).toISOString(), {
        activeUsers: toNumber(row[1]) ?? 0,
        pageviews: toNumber(row[2]) ?? 0,
      });
    }
    return map;
  } catch {
    return null;
  }
}

async function loadVercelSeries(
  period: AdminPeriod,
  filter: string | undefined,
): Promise<Map<string, { visitors: number; pageviews: number }> | null> {
  if (!vercelConfig()) return null;
  try {
    const rows = await vercelVisitsAggregate(period.granularity, period.since, period.until, 100, filter);
    const map = new Map<string, { visitors: number; pageviews: number }>();
    for (const row of rows) {
      if (!row.timestamp) continue;
      const key = new Date(row.timestamp).toISOString();
      map.set(key, { visitors: row.visitors, pageviews: row.pageviews });
    }
    return map;
  } catch {
    return null;
  }
}

function formatBucket(key: string, granularity: "hour" | "day"): string {
  const date = new Date(key);
  if (Number.isNaN(date.getTime())) return key;
  const fmt = new Intl.DateTimeFormat("es-BO", {
    timeZone: "UTC",
    ...(granularity === "hour" ? { hour: "2-digit", minute: "2-digit", hour12: false } : { day: "2-digit", month: "2-digit" }),
  });
  return fmt.format(date);
}

async function loadSeries(
  posthog: PostHogConfig | null,
  period: AdminPeriod,
  filters: AdminFilters,
  vercelFilter: string | undefined,
): Promise<SeriesPoint[] | null> {
  const [ph, vv] = await Promise.all([
    loadPostHogSeries(posthog, period, filters),
    loadVercelSeries(period, vercelFilter),
  ]);
  if (!ph && !vv) return null;
  const keys = new Set<string>([...(ph?.keys() ?? []), ...(vv?.keys() ?? [])]);
  return [...keys].sort().map((key) => ({
    key,
    label: formatBucket(key, period.granularity),
    visitors: vv?.get(key)?.visitors ?? null,
    pageviews: vv?.get(key)?.pageviews ?? ph?.get(key)?.pageviews ?? null,
    activeUsers: ph?.get(key)?.activeUsers ?? null,
  }));
}

async function loadEvents(config: PostHogConfig | null, period: AdminPeriod, filters: AdminFilters): Promise<EventMetric[]> {
  const missing = "Configura POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID y POSTHOG_API_HOST";
  if (!config) {
    return PRODUCT_EVENTS.map((event) => ({ event, label: EVENT_LABELS[event] ?? event, count: 0, users: 0, status: "pending_configuration", detail: missing }));
  }
  const list = PRODUCT_EVENTS.map((event) => `'${event}'`).join(", ");
  try {
    const rows = extractRows(
      await postHogRequest(
        config,
        `SELECT event, count() AS count, count(DISTINCT distinct_id) AS users FROM events WHERE ${timeSql("timestamp", period.since, period.until)} AND event IN (${list}) ${eventFiltersSql(filters)} GROUP BY event`,
      ),
    );
    const counts = new Map<string, { count: number; users: number }>();
    for (const row of rows) {
      const event = String(row[0] ?? "");
      const count = toNumber(row[1]);
      const users = toNumber(row[2]);
      if (event && count !== null) counts.set(event, { count, users: users ?? 0 });
    }
    return PRODUCT_EVENTS.map((event) => ({
      event,
      label: EVENT_LABELS[event] ?? event,
      count: counts.get(event)?.count ?? 0,
      users: counts.get(event)?.users ?? 0,
      status: "ok",
    }));
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Error consultando PostHog";
    return PRODUCT_EVENTS.map((event) => ({ event, label: EVENT_LABELS[event] ?? event, count: 0, users: 0, status: "error", detail }));
  }
}

interface FunnelEventRow {
  at: number;
  event: string;
}

function computeFunnel(byUser: Map<string, FunnelEventRow[]>, steps: readonly string[]): FunnelStage[] {
  return steps.map((step, index) => {
    let started = 0;
    let completed = 0;
    for (const userRows of byUser.values()) {
      userRows.sort((a, b) => a.at - b.at);
      let cursor = -1;
      let stepTime: number | null = null;
      for (let i = 0; i <= index; i += 1) {
        const eventName = steps[i];
        const found = userRows.find((row) => row.event === eventName && row.at > cursor);
        if (!found) {
          stepTime = null;
          break;
        }
        cursor = found.at;
        if (i === index) stepTime = found.at;
      }
      if (stepTime !== null) {
        started += 1;
        const next = steps[index + 1];
        if (!next) {
          completed += 1;
        } else {
          const hasNext = userRows.some((row) => row.event === next && row.at > stepTime);
          if (hasNext) completed += 1;
        }
      }
    }
    const conversion = started > 0 ? completed / started : null;
    const dropoff = started > 0 ? (started - completed) / started : null;
    return {
      key: step,
      label: EVENT_LABELS[step] ?? step,
      started,
      completed,
      conversion,
      dropoff,
    };
  });
}

async function loadFunnels(config: PostHogConfig | null, period: AdminPeriod, filters: AdminFilters): Promise<Funnel[]> {
  if (!config) {
    return FUNNEL_DEFS.map((funnel) => ({
      ...funnel,
      steps: funnel.steps.map((step) => ({ key: step, label: EVENT_LABELS[step] ?? step, started: 0, completed: 0, conversion: null, dropoff: null })),
      status: "pending_configuration",
      detail: "Configura POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID y POSTHOG_API_HOST",
    }));
  }
  const allEvents = [...new Set(FUNNEL_DEFS.flatMap((funnel) => funnel.steps))];
  const list = allEvents.map((event) => `'${event}'`).join(", ");
  try {
    const rows = extractRows(
      await postHogRequest(
        config,
        `SELECT timestamp, distinct_id, event FROM events WHERE ${timeSql("timestamp", period.since, period.until)} AND event IN (${list}) ${eventFiltersSql(filters)} ORDER BY timestamp ASC LIMIT 10001`,
      ),
    );
    if (rows.length > 10000) {
      return FUNNEL_DEFS.map((funnel) => ({
        ...funnel,
        steps: funnel.steps.map((step) => ({ key: step, label: EVENT_LABELS[step] ?? step, started: 0, completed: 0, conversion: null, dropoff: null })),
        status: "error",
        detail: "El período tiene demasiados eventos para calcular embudos con precisión",
      }));
    }
    const byUser = new Map<string, FunnelEventRow[]>();
    for (const row of rows) {
      const distinctId = String(row[1] ?? "");
      const event = String(row[2] ?? "");
      const at = Date.parse(String(row[0] ?? ""));
      if (!distinctId || !event || Number.isNaN(at)) continue;
      const listForUser = byUser.get(distinctId) ?? [];
      listForUser.push({ at, event });
      byUser.set(distinctId, listForUser);
    }
    return FUNNEL_DEFS.map((funnel) => ({
      ...funnel,
      steps: computeFunnel(byUser, funnel.steps),
      status: "ok",
    }));
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Error consultando PostHog";
    return FUNNEL_DEFS.map((funnel) => ({
      ...funnel,
      steps: funnel.steps.map((step) => ({ key: step, label: EVENT_LABELS[step] ?? step, started: 0, completed: 0, conversion: null, dropoff: null })),
      status: "error",
      detail,
    }));
  }
}

async function loadRecentEvents(config: PostHogConfig | null, period: AdminPeriod, filters: AdminFilters): Promise<RecentEvent[] | null> {
  if (!config) return null;
  try {
    const rows = extractRows(
      await postHogRequest(
        config,
        `SELECT timestamp, event, properties.$pathname AS path FROM events WHERE ${timeSql("timestamp", period.since, period.until)} ${eventFiltersSql(filters)} ORDER BY timestamp DESC LIMIT 50`,
      ),
    );
    return rows
      .map((row) => {
        const event = String(row[1] ?? "");
        if (!event || event.startsWith("$")) return null;
        const path = typeof row[2] === "string" && row[2] ? row[2] : null;
        return { at: String(row[0] ?? ""), event, label: EVENT_LABELS[event] ?? event, path };
      })
      .filter((item): item is RecentEvent => item !== null)
      .slice(0, 20);
  } catch {
    return null;
  }
}

const SOCIAL_NETWORK_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X",
  tiktok: "TikTok",
};

function labelSocialNetworks(items: BreakdownItem[] | null): BreakdownItem[] | null {
  if (!items) return null;
  return items.map((item) => {
    const label = Object.prototype.hasOwnProperty.call(SOCIAL_NETWORK_LABELS, item.name)
      ? SOCIAL_NETWORK_LABELS[item.name]
      : item.name;
    return { ...item, name: label };
  });
}

async function loadBreakdown(
  config: PostHogConfig | null,
  queryFor: (dimension: string) => string,
  dimension: string,
): Promise<BreakdownItem[] | null> {
  if (!config) return null;
  try {
    const rows = extractRows(await postHogRequest(config, queryFor(dimension)));
    return rows
      .map((row) => {
        const name = String(row[0] ?? "").trim();
        if (!name || name === "null") return null;
        return { name, count: toNumber(row[1]) ?? 0, users: toNumber(row[2]) ?? 0 };
      })
      .filter((item): item is BreakdownItem => item !== null)
      .slice(0, 10);
  } catch {
    return null;
  }
}

async function loadBehavior(
  posthog: PostHogConfig | null,
  period: AdminPeriod,
  filters: AdminFilters,
): Promise<FounderMetrics["behavior"]> {
  const [entryPages, exitPages, devices, countries, browsers, socialNetworks] = await Promise.all([
    posthog
      ? loadBreakdown(posthog, () => `SELECT $entry_pathname AS path, count() AS count, count(DISTINCT distinct_id) AS users FROM sessions WHERE ${timeSql("$start_timestamp", period.since, period.until)} GROUP BY path ORDER BY count DESC LIMIT 10`, "path")
      : Promise.resolve(null),
    posthog
      ? loadBreakdown(posthog, () => `SELECT $exit_pathname AS path, count() AS count, count(DISTINCT distinct_id) AS users FROM sessions WHERE ${timeSql("$start_timestamp", period.since, period.until)} GROUP BY path ORDER BY count DESC LIMIT 10`, "path")
      : Promise.resolve(null),
    posthog
      ? loadBreakdown(posthog, (dim) => `SELECT properties.${dim} AS value, count() AS count, count(DISTINCT distinct_id) AS users FROM events WHERE ${timeSql("timestamp", period.since, period.until)} ${eventFiltersSql(filters)} GROUP BY value ORDER BY count DESC LIMIT 10`, "$device_type")
      : Promise.resolve(null),
    posthog
      ? loadBreakdown(posthog, (dim) => `SELECT properties.${dim} AS value, count() AS count, count(DISTINCT distinct_id) AS users FROM events WHERE ${timeSql("timestamp", period.since, period.until)} ${eventFiltersSql(filters)} GROUP BY value ORDER BY count DESC LIMIT 10`, "$geoip_country_code")
      : Promise.resolve(null),
    posthog
      ? loadBreakdown(posthog, (dim) => `SELECT properties.${dim} AS value, count() AS count, count(DISTINCT distinct_id) AS users FROM events WHERE ${timeSql("timestamp", period.since, period.until)} ${eventFiltersSql(filters)} GROUP BY value ORDER BY count DESC LIMIT 10`, "$browser")
      : Promise.resolve(null),
    posthog
      ? loadBreakdown(posthog, () => `SELECT properties.network AS value, count() AS count, count(DISTINCT distinct_id) AS users FROM events WHERE ${timeSql("timestamp", period.since, period.until)} AND event = 'social_link_click' ${eventFiltersSql(filters)} GROUP BY value ORDER BY count DESC LIMIT 10`, "network")
      : Promise.resolve(null),
  ]);
  const status: MetricStatus = posthog ? "ok" : "pending_configuration";
  return {
    topPages: null,
    entryPages,
    exitPages,
    devices,
    countries,
    browsers,
    socialNetworks: labelSocialNetworks(socialNetworks),
    status,
    detail: posthog ? undefined : "Configura POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID y POSTHOG_API_HOST",
  };
}

async function loadVercelBehavior(period: AdminPeriod, filter: string | undefined): Promise<Pick<FounderMetrics["behavior"], "topPages" | "devices" | "countries" | "browsers"> | null> {
  if (!vercelConfig()) return null;
  try {
    const [topPages, devices, countries, browsers] = await Promise.all([
      vercelVisitsAggregate("route", period.since, period.until, 10, filter),
      vercelVisitsAggregate("deviceType", period.since, period.until, 10, filter),
      vercelVisitsAggregate("country", period.since, period.until, 10, filter),
      vercelVisitsAggregate("browserName", period.since, period.until, 10, filter),
    ]);
    const mapItems = (rows: typeof topPages, key: "route" | "requestPath" | "deviceType" | "country" | "browserName"): BreakdownItem[] =>
      rows
        .map((row) => {
          const name = String(row[key] ?? row.requestPath ?? "").trim();
          if (!name) return null;
          return { name, count: row.pageviews, users: row.visitors };
        })
        .filter((item): item is BreakdownItem => item !== null);
    return {
      topPages: mapItems(topPages, "route"),
      devices: mapItems(devices, "deviceType"),
      countries: mapItems(countries, "country"),
      browsers: mapItems(browsers, "browserName"),
    };
  } catch {
    return null;
  }
}

async function loadRecordings(config: PostHogConfig | null, period: AdminPeriod): Promise<{ recordings: Recording[] | null; status: MetricStatus; detail?: string }> {
  if (!config) return { recordings: null, status: "pending_configuration", detail: "Configura POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID y POSTHOG_API_HOST" };
  try {
    const url = new URL(`${config.apiHost}/api/projects/${config.projectId}/session_recordings/`);
    url.searchParams.set("limit", "100");
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`PostHog recordings respondió ${response.status}`);
    const data = (await response.json()) as { results?: unknown };
    const rows = Array.isArray(data.results) ? data.results : [];
    const sinceMs = period.since.getTime();
    const untilMs = period.until.getTime();
    const recordings = rows
      .map((item): Recording | null => {
        const row = item as Record<string, unknown>;
        const id = typeof row.id === "string" ? row.id : null;
        const startedAt = typeof row.start_time === "string" ? row.start_time : null;
        if (!id || !startedAt) return null;
        const startedAtMs = Date.parse(startedAt);
        if (Number.isNaN(startedAtMs) || startedAtMs < sinceMs || startedAtMs > untilMs) return null;
        const startUrl = typeof row.start_url === "string" ? row.start_url : "";
        let startPath = "/";
        try {
          startPath = startUrl ? new URL(startUrl).pathname : "/";
        } catch {
          startPath = startUrl.startsWith("/") ? startUrl : "/";
        }
        return {
          id,
          startedAt,
          durationSeconds: toNumber(row.recording_duration) ?? 0,
          startPath,
          consoleErrors: toNumber(row.console_error_count) ?? 0,
          replayUrl: `${config.apiHost}/project/${config.projectId}/replay/${id}`,
        };
      })
      .filter((item): item is Recording => item !== null)
      .slice(0, 20);
    return { recordings, status: "ok" };
  } catch (err) {
    return { recordings: null, status: "error", detail: err instanceof Error ? err.message : "Error consultando Session Replay" };
  }
}

const metricsCache = new Map<string, { expiresAt: number; value: FounderMetrics }>();
const CACHE_TTL_MS = 60_000;

export async function getFounderMetrics(input: {
  period: AdminPeriod;
  filters: AdminFilters;
  refresh?: boolean;
}): Promise<FounderMetrics> {
  const { period, filters } = input;
  const periodCacheKey = period.key === "custom" ? `custom:${period.since.toISOString()}:${period.until.toISOString()}` : period.key;
  const cacheKey = JSON.stringify({
    period: periodCacheKey,
    page: filters.page ?? null,
    device: filters.device ?? null,
  });
  const now = Date.now();
  if (!filters.refresh) {
    const cached = metricsCache.get(cacheKey);
    if (cached && cached.expiresAt > now) return cached.value;
  }

  const posthog = postHogConfig();
  const vercel = vercelConfig();
  const vercelFilter = vercelDimensionFilter(filters.page, filters.device);
  const missingPostHog = "Configura POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID y POSTHOG_API_HOST";
  const missingVercel = "Configura VERCEL_ACCESS_TOKEN y VERCEL_PROJECT_ID";

  const [
    visitors,
    pageviews,
    activeUsers,
    sessions,
    dau,
    wau,
    mau,
    series,
    events,
    funnels,
    recentEvents,
    behaviorPostHog,
    behaviorVercel,
    recordingsResult,
  ] = await Promise.all([
    vercelCountMetric(period.since, period.until, period.previousSince, period.previousUntil, vercelFilter, "visitors", missingVercel),
    vercelCountMetric(period.since, period.until, period.previousSince, period.previousUntil, vercelFilter, "pageviews", missingVercel),
    comparisonMetric(posthog, `SELECT count(DISTINCT distinct_id) AS value FROM events WHERE ${timeSql("timestamp", period.since, period.until)} ${eventFiltersSql(filters)}`, `SELECT count(DISTINCT distinct_id) AS value FROM events WHERE ${timeSql("timestamp", period.previousSince, period.previousUntil)} ${eventFiltersSql(filters)}`, missingPostHog),
    comparisonMetric(posthog, `SELECT count(DISTINCT session_id) AS value FROM sessions WHERE ${timeSql("$start_timestamp", period.since, period.until)}`, `SELECT count(DISTINCT session_id) AS value FROM sessions WHERE ${timeSql("$start_timestamp", period.previousSince, period.previousUntil)}`, missingPostHog),
    comparisonMetric(posthog, fixedMetricQuery(1, filters), fixedMetricQuery(1, filters), missingPostHog),
    comparisonMetric(posthog, fixedMetricQuery(7, filters), fixedMetricQuery(7, filters), missingPostHog),
    comparisonMetric(posthog, fixedMetricQuery(30, filters), fixedMetricQuery(30, filters), missingPostHog),
    loadSeries(posthog, period, filters, vercelFilter),
    loadEvents(posthog, period, filters),
    loadFunnels(posthog, period, filters),
    loadRecentEvents(posthog, period, filters),
    loadBehavior(posthog, period, filters),
    loadVercelBehavior(period, vercelFilter),
    loadRecordings(posthog, period),
  ]);

  const behavior: FounderMetrics["behavior"] = {
    ...behaviorPostHog,
    ...(behaviorVercel ?? {}),
    status: posthog || vercel ? "ok" : "pending_configuration",
    detail: posthog || vercel ? undefined : "Configura PostHog y/o Vercel",
  };

  const generatedAt = new Date().toISOString();
  const posthogEventsStatus: MetricStatus = events.every((event) => event.status === "ok") ? "ok" : events.some((event) => event.status === "error") ? "error" : "pending_configuration";
  const posthogLastSync = posthog && posthogEventsStatus === "ok" ? generatedAt : null;
  const vercelAnalyticsStatus: MetricStatus = !vercel ? "pending_configuration" : visitors.status === "error" || pageviews.status === "error" ? "error" : "ok";
  const vercelLastSync = vercelAnalyticsStatus === "ok" ? generatedAt : null;
  const value: FounderMetrics = {
    generatedAt,
    period: {
      key: period.key,
      label: period.label,
      granularity: period.granularity,
      from: period.since.toISOString(),
      to: period.until.toISOString(),
    },
    filters: {
      page: filters.page ?? null,
      device: filters.device ?? null,
    },
    posthog: {
      configured: Boolean(posthog),
      appUrl: posthog?.apiHost ?? null,
      projectId: posthog?.projectId ?? null,
    },
    vercel: {
      configured: Boolean(vercel),
      projectId: process.env.VERCEL_PROJECT_ID?.trim() || null,
    },
    overview: {
      visitors,
      pageviews,
      activeUsers,
      sessions,
      dau,
      wau,
      mau,
      newUsers: pending("PLATIK es anónimo; usuarios nuevos requiere identificación"),
      returningUsers: pending("PLATIK es anónimo; usuarios recurrentes requiere identificación"),
      visitorToActive: pending("Requiere definición de usuario activo identificado"),
    },
    series,
    recentEvents,
    behavior,
    events,
    funnels,
    recordings: recordingsResult.recordings,
    replayStatus: recordingsResult.status,
    replayDetail: recordingsResult.detail,
    integrations: [
      {
        id: "posthog",
        name: "PostHog",
        status: posthog ? (posthogEventsStatus === "ok" ? "ok" : posthogEventsStatus) : "pending_configuration",
        detail: posthog ? "Eventos, sesiones, embudos y Session Replay" : missingPostHog,
        metrics: ["Usuarios activos", "Sesiones", "Eventos de producto", "Embudos", "Session Replay"],
        url: posthog?.apiHost ?? null,
        lastSync: posthogLastSync,
      },
      {
        id: "vercel-analytics",
        name: "Vercel Analytics",
        status: vercelAnalyticsStatus,
        detail: vercelAnalyticsStatus === "error" ? (visitors.detail ?? pageviews.detail ?? "Error consultando Vercel Web Analytics") : vercel ? "Visitantes y páginas vistas de producción" : missingVercel,
        metrics: ["Visitantes", "Pageviews", "Rutas", "Dispositivos", "Países"],
        url: "https://vercel.com/dashboard",
        lastSync: vercelLastSync,
      },
      {
        id: "speed-insights",
        name: "Vercel Speed Insights",
        status: "pending_configuration",
        detail: "Componente integrado; no hay API REST pública para Core Web Vitals. Usa `vercel metrics` o el dashboard.",
        metrics: ["LCP", "INP", "CLS", "FCP", "TTFB"],
        url: "https://vercel.com/dashboard",
        lastSync: null,
      },
    ],
    performance: {
      webAnalytics: visitors.status === "ok" ? { status: "ok", value: visitors.value, detail: "Visitantes y pageviews desde Vercel Web Analytics" } : visitors,
      speedInsights: pending("Speed Insights no expone API REST pública; revisa el dashboard de Vercel"),
      coreWebVitals: pending("Core Web Vitals se consulta en Vercel Speed Insights / `vercel metrics`"),
    },
  };

  metricsCache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, value });
  if (metricsCache.size > 50) {
    const oldest = metricsCache.keys().next().value;
    if (oldest) metricsCache.delete(oldest);
  }
  return value;
}
