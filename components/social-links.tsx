"use client";

import { track } from "@/lib/analytics";

const SOCIAL_LINKS = [
  { network: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/company/somosplatik/" },
  { network: "facebook", label: "Facebook", href: "https://www.facebook.com/profile.php?id=61596549126851" },
  { network: "instagram", label: "Instagram", href: "https://www.instagram.com/somosplatik" },
  { network: "x", label: "X", href: "https://x.com/somosplatik" },
  { network: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@somosplatik" },
] as const;

export function SocialLinks() {
  return (
    <nav aria-label="Redes sociales de PLATIK" className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
      {SOCIAL_LINKS.map((link) => (
        <a
          key={link.network}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          onClick={() => track("social_link_click", { network: link.network })}
          className="rounded-full border border-petroleo/10 px-3 py-1 text-xs font-medium text-petroleo transition hover:bg-menta-100"
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
