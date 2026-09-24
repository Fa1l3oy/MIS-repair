"use client";

import { Search } from "lucide-react";
import { openCommandPalette, useShortcutLabel } from "./command-palette";

/** Search box look-alike (desktop sidebar) or icon button (mobile top bar). */
export function SearchTrigger({ variant }: { variant: "box" | "icon" }) {
  const shortcut = useShortcutLabel();
  if (variant === "icon") {
    return (
      <button type="button" onClick={openCommandPalette} className="btn-icon" aria-label="ค้นหา">
        <Search className="size-5" strokeWidth={1.75} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={openCommandPalette}
      className="flex w-full items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-sm text-zinc-400 transition hover:border-zinc-300 hover:bg-white"
    >
      <Search className="size-4" strokeWidth={1.75} />
      <span className="flex-1 text-left">ค้นหา...</span>
      <kbd className="rounded-md border border-zinc-200 bg-white px-1.5 text-[11px] font-medium text-zinc-400">{shortcut}</kbd>
    </button>
  );
}
