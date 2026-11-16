"use client";

import { MessageCircle } from "lucide-react";

const DEFAULT_FEEDBACK_URL = "https://tally.so/r/NqXXGG";

/** Enlace de feedback: NEXT_PUBLIC_FEEDBACK_URL tiene prioridad sobre el formulario por defecto. */
export function FeedbackLink({ className = "" }: { className?: string }) {
  const url = process.env.NEXT_PUBLIC_FEEDBACK_URL || DEFAULT_FEEDBACK_URL;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2 rounded-xl border border-petroleo/15 bg-white px-3.5 py-2.5 text-sm font-medium text-petroleo transition-colors hover:border-menta-600 hover:text-menta-700 ${className}`}
    >
      <MessageCircle size={16} />
      Enviar feedback
    </a>
  );
}
