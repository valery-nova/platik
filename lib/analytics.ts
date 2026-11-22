"use client";

import posthog from "posthog-js";

export type AnalyticsEvent =
  | "page_view"
  | "demo_started"
  | "dashboard_viewed"
  | "analysis_viewed"
  | "onboarding_started"
  | "onboarding_completed"
  | "income_created"
  | "expense_created"
  | "transaction_created"
  | "transaction_failed"
  | "category_selected"
  | "goal_created"
  | "goal_contribution_started"
  | "goal_contribution_completed"
  | "wallet_connect_clicked"
  | "wallet_connected"
  | "usdc_deposit_started"
  | "usdc_deposit_completed"
  | "app_beta_click"
  | "social_link_click"
  | "feature_error";

const ALLOWED_KEYS = new Set([
  "path",
  "mode",
  "option",
  "tipo",
  "moneda",
  "reason",
  "feature",
  "stage",
  "network",
  "source",
  "filter",
  "has_conversion",
]);

let ready = false;

export function initAnalytics(): void {
  if (ready || typeof window === "undefined") return;
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!token) return;
  try {
    posthog.init(token, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      defaults: "2026-08-30",
      capture_pageview: false,
      autocapture: false,
      person_profiles: "identified_only",
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "*",
      },
    });
    ready = true;
  } catch {
    // La analítica nunca debe romper la app.
  }
}

export function analyticsProperties(
  _event: AnalyticsEvent,
  input: Record<string, string | number | boolean | undefined> = {},
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_KEYS.has(key) || value === undefined || value === "") continue;
    out[key] = value;
  }
  return out;
}

export function track(
  event: AnalyticsEvent,
  properties: Record<string, string | number | boolean | undefined> = {},
): void {
  if (!ready || typeof window === "undefined") return;
  try {
    posthog.capture(event, analyticsProperties(event, properties));
  } catch {
    // ignore
  }
}
