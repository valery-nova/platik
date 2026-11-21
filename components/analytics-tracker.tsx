"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || last.current === pathname) return;
    last.current = pathname;
    track("page_view", { path: pathname });
    if (pathname === "/panel") track("dashboard_viewed", { path: pathname });
    if (pathname === "/panel/analisis") track("analysis_viewed", { path: pathname });
  }, [pathname]);

  return null;
}
