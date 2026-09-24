import { Wrench } from "lucide-react";

export function BrandMark({ className = "size-9" }: { className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-brand-500 to-violet-600 text-white shadow-soft ${className}`}
    >
      <Wrench className="size-[55%]" strokeWidth={2.25} />
    </span>
  );
}

export function BrandName() {
  return (
    <span className="min-w-0 leading-tight">
      <span className="block text-sm font-semibold tracking-tight text-zinc-900">Repair MIS</span>
      <span className="block text-xs text-zinc-500">ระบบแจ้งซ่อม</span>
    </span>
  );
}
