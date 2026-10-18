"use client";

import Image from "next/image";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-petroleo/8 bg-white shadow-[0_1px_3px_rgba(11,61,59,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-petroleo">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-sm text-tinta-suave">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

type ButtonVariant = "primary" | "accent" | "ghost" | "danger" | "outline";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-petroleo text-white hover:bg-petroleo-800 focus-visible:outline-petroleo",
  accent:
    "bg-menta text-petroleo font-semibold hover:bg-menta-600 hover:text-white focus-visible:outline-menta-600",
  ghost:
    "bg-transparent text-petroleo hover:bg-petroleo-50 focus-visible:outline-petroleo",
  outline:
    "border border-petroleo/20 bg-white text-petroleo hover:border-petroleo/50 focus-visible:outline-petroleo",
  danger:
    "bg-coral-600 text-white hover:bg-coral focus-visible:outline-coral-600",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  onClick,
  disabled,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_STYLES[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "menta" | "coral" | "lavanda" | "demo";
}) {
  const tones = {
    neutral: "bg-petroleo-50 text-petroleo-800",
    menta: "bg-menta-100 text-menta-700",
    coral: "bg-coral-100 text-coral-600",
    lavanda: "bg-lavanda-100 text-lavanda-600",
    demo: "bg-lavanda-100 text-lavanda-600 border border-dashed border-lavanda/60",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function DemoBadge() {
  return <Badge tone="demo">Datos de demostración</Badge>;
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-petroleo">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-tinta-suave">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-petroleo/15 bg-white px-3.5 py-2.5 text-sm text-tinta placeholder:text-tinta-suave/60 focus:border-menta-600 focus:outline-2 focus:outline-menta/40";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${inputClass} ${props.className ?? ""}`} />
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-petroleo/40 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="anim-pop max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-petroleo">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-tinta-suave hover:bg-petroleo-50 hover:text-petroleo"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "menta",
}: {
  /** 0-100 */
  value: number;
  tone?: "menta" | "lavanda" | "coral";
}) {
  const colors = {
    menta: "bg-menta-600",
    lavanda: "bg-lavanda-600",
    coral: "bg-coral-600",
  };
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full bg-petroleo-50"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${colors[tone]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function PanelSkeleton() {
  return (
    <div className="space-y-6 pb-10">
      <div className="h-9 w-56 animate-pulse rounded-xl bg-petroleo/8" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-petroleo/6" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-petroleo/6" />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  mascot = "explica",
}: {
  title: string;
  description: string;
  action?: ReactNode;
  mascot?: "main" | "analiza" | "celebra" | "explica";
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <Image
        src={`/brand/mascot_${mascot}.png`}
        alt="Mascota de PLATIK"
        width={140}
        height={140}
        className="h-32 w-auto object-contain"
      />
      <h3 className="text-base font-semibold text-petroleo">{title}</h3>
      <p className="max-w-sm text-sm text-tinta-suave">{description}</p>
      {action}
    </div>
  );
}
