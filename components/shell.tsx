"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeftRight,
  Briefcase,
  Check,
  ChevronDown,
  LayoutDashboard,
  Menu,
  PieChart,
  Target,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { DemoBadge } from "./ui";
import { FeedbackLink } from "./feedback";
import { BrandLogo } from "./brand-logo";
import { PreferenceToggles } from "./preference-toggles";
import { usePlatik } from "@/lib/store";
import { usePreferences } from "@/lib/preferences";
import { PERSONAL_SPACE } from "@/lib/storage";

const NAV = [
  { href: "/panel", key: "panel", icon: LayoutDashboard },
  { href: "/panel/transacciones", key: "transacciones", icon: ArrowLeftRight },
  { href: "/panel/analisis", key: "analisis", icon: PieChart },
  { href: "/panel/metas", key: "metas", icon: Target },
  { href: "/panel/billetera", key: "billetera", icon: Wallet },
  { href: "/panel/perfil", key: "perfil", icon: User },
] as const;

type NavKey = (typeof NAV)[number]["key"];

function SpaceSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const { ventures, activeSpaceId, selectSpace } = usePlatik();
  const [open, setOpen] = useState(false);
  const options = [
    { id: PERSONAL_SPACE, nombre: "Personal", icon: Users },
    ...ventures.map((v) => ({ id: v.id, nombre: v.nombre, icon: Briefcase })),
  ];
  const current = options.find((o) => o.id === activeSpaceId) ?? options[0];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-xl border border-petroleo/10 bg-marfil/60 px-3 py-2 text-left text-sm font-medium text-petroleo transition hover:border-petroleo/25 dark:border-white/10 dark:bg-white/5 dark:text-white"
      >
        <current.icon size={16} className="shrink-0 text-menta-700" />
        <span className="min-w-0 flex-1 truncate">{current.nombre}</span>
        <ChevronDown size={14} className={`shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <ul
            role="listbox"
            aria-label="Espacio financiero"
            className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-petroleo/10 bg-white shadow-lg dark:border-white/10 dark:bg-petroleo-800"
          >
            {options.map((o) => (
              <li key={o.id} role="option" aria-selected={o.id === activeSpaceId}>
                <button
                  type="button"
                  onClick={() => {
                    selectSpace(o.id);
                    setOpen(false);
                    onNavigate?.();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-tinta-suave hover:bg-menta-50 dark:text-white/80 dark:hover:bg-white/10"
                >
                  <o.icon size={15} className="text-menta-700" />
                  <span className="flex-1 truncate text-left">{o.nombre}</span>
                  {o.id === activeSpaceId && <Check size={14} className="text-menta-700" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = usePreferences();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, key, icon: Icon }) => {
        const label = t.nav[key as NavKey];
        const active = href === "/panel" ? pathname === "/panel" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-menta-100 text-petroleo dark:bg-menta/20 dark:text-menta"
                : "text-tinta-suave hover:bg-petroleo-50 hover:text-petroleo dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={18} strokeWidth={active ? 2.4 : 2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { mode, hydrated } = usePlatik();
  const { t, lang } = usePreferences();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-petroleo/8 bg-white px-4 py-6 lg:flex dark:border-white/10 dark:bg-petroleo-800">
        <Link href="/" className="mb-2 block px-2" aria-label={t.shell.home}>
          <BrandLogo variant="without-slogan" className="h-9 w-auto" />
        </Link>
        <p className="mb-4 px-2 text-xs text-tinta-suave dark:text-white/60">{t.shell.tagline}</p>
        <div className="mb-4 px-2">
          <SpaceSwitcher />
        </div>
        <NavLinks />
        <div className="mt-auto flex flex-col gap-3 px-2">
          <PreferenceToggles className="w-full" />
          <DemoBadge />
          <FeedbackLink className="w-full justify-center" />
          <Image
            src="/brand/mascota/expresiones/expresion-explica.png"
            alt=""
            width={120}
            height={120}
            className="h-24 w-auto self-center object-contain"
          />
        </div>
      </aside>

      {/* Barra superior móvil */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-2 border-b border-petroleo/8 bg-white/90 px-4 py-3 backdrop-blur lg:hidden dark:border-white/10 dark:bg-petroleo-800/90">
        <Link href="/" aria-label={t.shell.home} className="shrink-0">
          <BrandLogo variant="without-slogan" className="h-7 w-auto" />
        </Link>
        <div className="flex items-center gap-2">
          <PreferenceToggles />
          <button
            onClick={() => setMenuOpen(true)}
            aria-label={t.shell.menu}
            className="rounded-lg p-2 text-petroleo hover:bg-petroleo-50 dark:text-white dark:hover:bg-white/10"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* Drawer móvil */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-petroleo/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="anim-pop h-full w-72 bg-white p-5 shadow-xl dark:bg-petroleo-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <BrandLogo variant="without-slogan" className="h-8 w-auto" />
              <button
                onClick={() => setMenuOpen(false)}
                aria-label={t.shell.close}
                className="rounded-lg p-1.5 text-tinta-suave hover:bg-petroleo-50 dark:text-white/70 dark:hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mb-4 flex items-center justify-between gap-2">
              <SpaceSwitcher onNavigate={() => setMenuOpen(false)} />
            </div>
            <PreferenceToggles className="mb-4" />
            <NavLinks onNavigate={() => setMenuOpen(false)} />
            <div className="mt-4"><FeedbackLink className="w-full justify-center" /></div>
          </div>
        </div>
      )}

      {/* Contenido */}
      <main className="w-full px-4 pb-16 pt-20 sm:px-6 lg:ml-64 lg:px-10 lg:pt-10">
        <div key={lang} className="mx-auto max-w-6xl">
          {hydrated && mode === "beta" && (
            <div className="mb-4 rounded-2xl border border-lavanda/30 bg-lavanda-50 px-4 py-3 text-sm text-petroleo dark:bg-lavanda/20 dark:text-white">
              {t.shell.beta} <DemoBadge inline />
            </div>
          )}
          {children}
        </div>
      </main>

      {/* Tab bar móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-petroleo/8 bg-white/95 py-2 backdrop-blur lg:hidden dark:border-white/10 dark:bg-petroleo-800/95">
        {NAV.map(({ href, key, icon: Icon }) => (
          <MobileTab key={href} href={href} label={t.nav[key as NavKey]} icon={Icon} />
        ))}
      </nav>
    </div>
  );
}

function MobileTab({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}) {
  const pathname = usePathname();
  const active = href === "/panel" ? pathname === "/panel" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[11px] font-medium ${
        active ? "text-petroleo dark:text-menta" : "text-tinta-suave dark:text-white/70"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={20} strokeWidth={active ? 2.4 : 2} />
      {label}
    </Link>
  );
}
