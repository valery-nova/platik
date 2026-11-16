import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "platik_admin_session";
const DEFAULT_TTL_SECONDS = 8 * 60 * 60;

function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET?.trim() ?? "";
}

function sessionTtlSeconds(): number {
  const raw = Number(process.env.ADMIN_SESSION_TTL_SECONDS ?? DEFAULT_TTL_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_TTL_SECONDS;
}

export function adminSessionCookieMaxAgeSeconds(): number {
  return sessionTtlSeconds();
}

export function adminConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_FOUNDER_EMAIL?.trim() &&
      process.env.ADMIN_FOUNDER_PASSWORD &&
      sessionSecret(),
  );
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function verifyAdminCredentials(email: string, password: string): boolean {
  if (!adminConfigured()) return false;
  const expectedEmail = process.env.ADMIN_FOUNDER_EMAIL!.trim().toLowerCase();
  const expectedPassword = process.env.ADMIN_FOUNDER_PASSWORD!;
  return (
    safeEqual(email.trim().toLowerCase(), expectedEmail) &&
    safeEqual(digest(password), digest(expectedPassword))
  );
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function createAdminSessionToken(): string {
  const exp = Math.floor(Date.now() / 1000) + sessionTtlSeconds();
  const payload = Buffer.from(JSON.stringify({ role: "founder", exp }), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSessionToken(token: string | undefined): boolean {
  if (!sessionSecret() || !token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!safeEqual(signature, sign(payload))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      role?: unknown;
      exp?: unknown;
    };
    return data.role === "founder" && typeof data.exp === "number" && data.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
