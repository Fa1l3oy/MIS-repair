import Link from "next/link";

export type SegmentItem = { href: string; label: string; active: boolean; count?: number };

/** Pill-style tab switcher driven by links (keeps filters in the URL). */
export function SegmentedLinks({ items, label }: { items: SegmentItem[]; label: string }) {
  return (
    <nav
      aria-label={label}
      className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-zinc-100 p-1 [scrollbar-width:none]"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition ${
            item.active ? "bg-white text-zinc-900 shadow-soft" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          {item.label}
          {item.count !== undefined && item.count > 0 && (
            <span
              className={`rounded-full px-1.5 text-[11px] leading-5 font-semibold tabular-nums ${
                item.active ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-600"
              }`}
            >
              {item.count}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
