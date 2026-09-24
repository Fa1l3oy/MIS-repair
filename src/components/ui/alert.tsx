import { CircleAlert, CircleCheck, Info } from "lucide-react";

const TONES = {
  error: { box: "bg-rose-50 text-rose-800 ring-rose-600/15", icon: CircleAlert, iconClass: "text-rose-500" },
  success: { box: "bg-emerald-50 text-emerald-800 ring-emerald-600/15", icon: CircleCheck, iconClass: "text-emerald-500" },
  info: { box: "bg-sky-50 text-sky-800 ring-sky-600/15", icon: Info, iconClass: "text-sky-500" },
} as const;

export function Alert({
  tone = "info",
  title,
  children,
  className = "",
}: {
  tone?: keyof typeof TONES;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const t = TONES[tone];
  const Icon = t.icon;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-3 rounded-xl px-4 py-3 text-sm ring-1 ${t.box} ${className}`}>
      <Icon className={`mt-0.5 size-[18px] shrink-0 ${t.iconClass}`} strokeWidth={2} />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={title ? "mt-0.5 opacity-90" : ""}>{children}</div>}
      </div>
    </div>
  );
}
