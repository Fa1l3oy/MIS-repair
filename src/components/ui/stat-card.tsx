import type { LucideIcon } from "lucide-react";
import Link from "next/link";

const TONES = {
  zinc: "bg-zinc-100 text-zinc-600",
  brand: "bg-brand-50 text-brand-600",
  sky: "bg-sky-50 text-sky-600",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-600",
} as const;

export type StatTone = keyof typeof TONES;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "zinc",
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: StatTone;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-zinc-500">{label}</p>
        {Icon && (
          <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}>
            <Icon className="size-4" strokeWidth={2} />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </>
  );

  return href ? (
    <Link href={href} className="card block p-4 transition hover:-translate-y-0.5 hover:shadow-lift sm:p-5">
      {body}
    </Link>
  ) : (
    <div className="card p-4 sm:p-5">{body}</div>
  );
}
