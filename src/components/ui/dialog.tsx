"use client";

import { X } from "lucide-react";
import { useEffect, useEffectEvent } from "react";

/** Modal dialog: centred card on larger screens, bottom sheet on phones. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const close = useEffectEvent(onClose);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="ปิด"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]"
      />
      <div className="animate-sheet-up relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-lift sm:max-w-lg sm:rounded-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="btn-icon -mt-1 -mr-2" aria-label="ปิด">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
