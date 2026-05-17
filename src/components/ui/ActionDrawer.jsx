"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export default function ActionDrawer({ open, title, description, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[720px] flex-col border-l border-slate-200 bg-white shadow-[-12px_0_32px_rgba(15,23,42,0.14)]" role="dialog" aria-modal="true" aria-label={title}>
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold leading-tight text-dinkes-900">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
          </div>
          <button className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-ring" type="button" onClick={onClose} aria-label="Tutup panel">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {children}
        </div>
      </aside>
    </div>
  );
}
