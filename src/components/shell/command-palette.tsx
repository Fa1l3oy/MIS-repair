"use client";

import { Bell, ClipboardList, CornerDownLeft, LoaderCircle, Plus, Search, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { RequestStatus, Role } from "@/generated/prisma/enums";
import { StatusBadge } from "../badges";
import { navSections, PROFILE } from "./nav";

const OPEN_EVENT = "open-command-palette";

/** Opens the palette from anywhere (sidebar search box, mobile search button). */
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

const noopSubscribe = () => () => {};
/** "⌘K" on Apple devices, "Ctrl K" elsewhere (hydration-safe). */
export function useShortcutLabel() {
  return useSyncExternalStore(
    noopSubscribe,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K"),
    () => "Ctrl K",
  );
}

type Found = {
  id: string;
  code: string;
  equipment: string;
  status: RequestStatus;
  location: string;
  building: { name: string };
};

type Item =
  | { kind: "page"; key: string; label: string; href: string; icon: LucideIcon }
  | { kind: "request"; key: string; href: string; request: Found };

export function CommandPalette({ role }: { role: Role }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Found[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  const pages = useMemo(
    () => [
      { label: "แจ้งซ่อมใหม่", href: "/requests/new", icon: Plus },
      ...navSections(role).flatMap((s) => s.items.map((i) => ({ label: i.label, href: i.href, icon: i.icon }))),
      { label: "การแจ้งเตือน", href: "/notifications", icon: Bell },
      { label: PROFILE.label, href: PROFILE.href, icon: PROFILE.icon },
    ],
    [role],
  );

  // Ctrl/⌘ + K toggles, and the custom event opens it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Debounced server search; stale responses are aborted.
  useEffect(() => {
    const q = query.trim();
    if (!open || !q) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (res.ok) setFound(((await res.json()) as { requests: Found[] }).requests);
      } catch {
        // aborted or offline
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  const q = query.trim().toLowerCase();
  const items: Item[] = [
    ...(q ? found : []).map((r) => ({ kind: "request" as const, key: r.id, href: `/requests/${r.id}`, request: r })),
    ...pages
      .filter((p) => !q || p.label.toLowerCase().includes(q))
      .map((p) => ({ kind: "page" as const, key: p.href, ...p })),
  ];

  function close() {
    setOpen(false);
    setQuery("");
    setFound([]);
    setLoading(false);
    setActive(0);
  }

  function go(item: Item | undefined) {
    if (!item) return;
    close();
    router.push(item.href);
  }

  if (!open) return null;

  const requestItems = items.filter((i) => i.kind === "request");
  const pageItems = items.filter((i) => i.kind === "page");
  let index = -1;
  const row = (item: Item, content: React.ReactNode) => {
    index++;
    const i = index;
    return (
      <li key={item.key} id={`command-palette-item-${i}`} role="option" aria-selected={active === i}>
        <button
          type="button"
          onMouseMove={() => setActive(i)}
          onClick={() => go(item)}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
            active === i ? "bg-zinc-100 text-zinc-900" : "text-zinc-700"
          }`}
        >
          {content}
          {active === i && <CornerDownLeft className="ml-auto size-4 shrink-0 text-zinc-400" />}
        </button>
      </li>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="ค้นหา">
      <button type="button" aria-label="ปิด" onClick={close} className="animate-fade-in absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]" />
      <div className="animate-sheet-up relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-zinc-200/80">
        <div className="flex items-center gap-3 border-b border-zinc-100 px-4">
          {loading ? (
            <LoaderCircle className="size-5 shrink-0 animate-spin text-zinc-400" />
          ) : (
            <Search className="size-5 shrink-0 text-zinc-400" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              if (!e.target.value.trim()) {
                // The in-flight search is aborted, so its own finally won't clear these.
                setFound([]);
                setLoading(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, items.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(items[active]);
              } else if (e.key === "Escape") {
                close();
              }
            }}
            placeholder="ค้นหาเลขที่ใบแจ้งซ่อม อุปกรณ์ สถานที่ หรือเมนู..."
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            aria-label="คำค้นหา"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-results"
            aria-activedescendant={items[active] ? `command-palette-item-${active}` : undefined}
          />
          <kbd className="hidden rounded-md border border-zinc-200 px-1.5 py-0.5 text-[11px] font-medium text-zinc-400 sm:block">
            Esc
          </kbd>
        </div>

        <ul id="command-palette-results" className="max-h-[60vh] overflow-y-auto p-2" role="listbox" aria-label="ผลการค้นหา">
          {requestItems.length > 0 && (
            <>
              <li className="px-3 pt-2 pb-1 text-xs font-medium text-zinc-400" role="presentation">
                ใบแจ้งซ่อม
              </li>
              {requestItems.map((item) =>
                row(
                  item,
                  item.kind === "request" && (
                    <>
                      <ClipboardList className="size-4 shrink-0 text-zinc-400" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="chip">{item.request.code}</span>
                          <span className="truncate font-medium">{item.request.equipment}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-zinc-500">
                          {item.request.building.name} · {item.request.location}
                        </span>
                      </span>
                      <span className="hidden sm:block">
                        <StatusBadge status={item.request.status} />
                      </span>
                    </>
                  ),
                ),
              )}
            </>
          )}
          {q && !loading && requestItems.length === 0 && (
            <li className="px-3 py-3 text-sm text-zinc-500" role="presentation">
              ไม่พบใบแจ้งซ่อมที่ตรงกับ “{query.trim()}”
            </li>
          )}
          {pageItems.length > 0 && (
            <>
              <li className="px-3 pt-2 pb-1 text-xs font-medium text-zinc-400" role="presentation">
                ไปที่หน้า
              </li>
              {pageItems.map((item) => {
                if (item.kind !== "page") return null;
                const Icon = item.icon;
                return row(
                  item,
                  <>
                    <Icon className="size-4 shrink-0 text-zinc-400" strokeWidth={1.75} />
                    <span className="truncate">{item.label}</span>
                  </>,
                );
              })}
            </>
          )}
        </ul>
        <div className="flex items-center gap-4 border-t border-zinc-100 px-4 py-2.5 text-[11px] text-zinc-400">
          <span>↑↓ เลือก</span>
          <span>Enter เปิด</span>
          <span>Esc ปิด</span>
        </div>
      </div>
    </div>
  );
}
