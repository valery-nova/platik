"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeftRight,
  LayoutDashboard,
  Menu,
  PieChart,
  Target,
  User,
  X,
} from "lucide-react";
import { DemoBadge } from "./ui";

const NAV = [
  { href: "/panel", label: "Panel", icon: LayoutDashboard },
  { href: "/panel/transacciones", label: "Transacciones", icon: ArrowLeftRight },
  { href: "/panel/analisis", label: "Análisis", icon: PieChart },
  { href: "/panel/metas", label: "Metas", icon: Target },
  { href: "/panel/perfil", label: "Perfil", icon: User },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/panel" ? pathname === "/panel" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-menta-100 text-petroleo"
                : "text-tinta-suave hover:bg-petroleo-50 hover:text-petroleo"
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

  return (
    <div className="flex min-h-screen">
      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-petroleo/8 bg-white px-4 py-6 lg:flex">
        <Link href="/" className="mb-2 block px-2" aria-label="Ir a la portada">
          <Image
            src="/brand/logo_horizontal.png"
            alt="PLATIK"
            width={170}
            height={47}
            className="h-9 w-auto"
            priority
          />
        </Link>
        <p className="mb-6 px-2 text-xs text-tinta-suave">
          Tu copiloto financiero con IA
        </p>
        <NavLinks />
        <div className="mt-auto flex flex-col gap-3 px-2">
          <DemoBadge />
          <Image
            src="/brand/mascot_explica.png"
            alt=""
            width={120}
            height={120}
            className="h-24 w-auto self-center object-contain"
          />
        </div>
      </aside>

      {/* Barra superior móvil */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-petroleo/8 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" aria-label="Ir a la portada">
          <Image
            src="/brand/logo_horizontal.png"
            alt="PLATIK"
            width={130}
            height={36}
            className="h-7 w-auto"
            priority
          />
        </Link>
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
          className="rounded-lg p-2 text-petroleo hover:bg-petroleo-50"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* Drawer móvil */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-petroleo/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="anim-pop h-full w-72 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <Image
                src="/brand/logo_horizontal.png"
                alt="PLATIK"
                width={140}
                height={39}
                className="h-8 w-auto"
              />
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar menú"
                className="rounded-lg p-1.5 text-tinta-suave hover:bg-petroleo-50"
              >
                <X size={20} />
              </button>
            </div>
            <NavLinks onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Contenido */}
      <main className="w-full px-4 pb-16 pt-20 sm:px-6 lg:ml-64 lg:px-10 lg:pt-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* Tab bar móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-petroleo/8 bg-white/95 py-2 backdrop-blur lg:hidden">
        {NAV.map(({ href, label, icon: Icon }) => {
          return <MobileTab key={href} href={href} label={label} icon={Icon} />;
        })}
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
  const active =
    href === "/panel" ? pathname === "/panel" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[11px] font-medium ${
        active ? "text-petroleo" : "text-tinta-suave"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={20} strokeWidth={active ? 2.4 : 2} />
      {label}
    </Link>
  );
}
