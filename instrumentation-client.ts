import { initAnalytics, setAnalyticsCaptureEnabled } from "./lib/analytics";

initAnalytics();

function syncCapture(url?: string): void {
  const path = url
    ? new URL(url, window.location.origin).pathname
    : window.location.pathname;
  setAnalyticsCaptureEnabled(!path.startsWith("/admin"));
}

syncCapture();

export function onRouterTransitionStart(url: string): void {
  syncCapture(url);
}
