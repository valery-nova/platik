"use client";

import type { ReactNode } from "react";
import { track } from "@/lib/analytics";

export function AppBetaLink({
  className = "",
  title,
  children,
}: {
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <a
      href="/downloads/platik-beta.apk"
      download="platik-beta.apk"
      className={className}
      title={title}
      onClick={() => track("app_beta_click", { source: "landing" })}
    >
      {children}
    </a>
  );
}
