export interface VercelConfig {
  token: string;
  projectId: string;
  teamId: string | null;
}

export function vercelConfig(): VercelConfig | null {
  const token = process.env.VERCEL_ACCESS_TOKEN?.trim() || process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim() || process.env.VERCEL_TEAM_SLUG?.trim() || null;
  if (!token || !projectId) return null;
  return { token, projectId, teamId };
}

export interface VercelCount {
  pageviews: number;
  visitors: number;
}

export interface VercelAggregateRow {
  timestamp?: string;
  route?: string;
  requestPath?: string;
  deviceType?: string;
  country?: string;
  browserName?: string;
  pageviews: number;
  visitors: number;
}

async function vercelRequest(path: string, params: Record<string, string | number | undefined>): Promise<unknown> {
  const config = vercelConfig();
  if (!config) throw new Error("Vercel no configurado");
  const url = new URL(`https://api.vercel.com${path}`);
  url.searchParams.set("projectId", config.projectId);
  if (config.teamId) url.searchParams.set("teamId", config.teamId);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${config.token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Vercel respondió ${response.status}`);
  return response.json();
}

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function vercelVisitsCount(
  since: Date,
  until: Date,
  filter?: string,
): Promise<VercelCount> {
  const data = (await vercelRequest("/v1/query/web-analytics/visits/count", {
    since: since.toISOString(),
    until: until.toISOString(),
    filter,
  })) as { data?: { pageviews?: unknown; visitors?: unknown } };
  return {
    pageviews: toNumber(data.data?.pageviews),
    visitors: toNumber(data.data?.visitors),
  };
}

export async function vercelVisitsAggregate(
  by: "hour" | "day" | "route" | "deviceType" | "country" | "browserName",
  since: Date,
  until: Date,
  limit = 20,
  filter?: string,
): Promise<VercelAggregateRow[]> {
  const data = (await vercelRequest("/v1/query/web-analytics/visits/aggregate", {
    since: since.toISOString(),
    until: until.toISOString(),
    by,
    limit,
    filter,
  })) as { data?: unknown };
  const rows = Array.isArray(data.data) ? data.data : [];
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      timestamp: typeof r.timestamp === "string" ? r.timestamp : undefined,
      route: typeof r.route === "string" ? r.route : undefined,
      requestPath: typeof r.requestPath === "string" ? r.requestPath : undefined,
      deviceType: typeof r.deviceType === "string" ? r.deviceType : undefined,
      country: typeof r.country === "string" ? r.country : undefined,
      browserName: typeof r.browserName === "string" ? r.browserName : undefined,
      pageviews: toNumber(r.pageviews),
      visitors: toNumber(r.visitors),
    };
  });
}

export function vercelDimensionFilter(page?: string, device?: string): string | undefined {
  const parts: string[] = [];
  if (page) parts.push(`requestPath eq '${page}'`);
  if (device) parts.push(`deviceType eq '${device}'`);
  return parts.length ? parts.join(" and ") : undefined;
}
