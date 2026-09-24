"use client";

import { ExternalLink, Printer, QrCode, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { BrandMark } from "@/components/shell/brand-mark";
import { EmptyState } from "@/components/ui/empty-state";
import { deleteQrTag } from "./actions";

export type Sticker = {
  id: string;
  url: string;
  qr: string;
  equipment: string | null;
  assetNumber: string | null;
  place: string;
  category: string | null;
  uses: number;
};

/** Grid of printable stickers; tick some to print only those. */
export function QrSheet({ stickers }: { stickers: Sticker[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  if (stickers.length === 0) {
    return <EmptyState icon={QrCode} title="ยังไม่มี QR Code" description="สร้าง QR แรกจากฟอร์มด้านซ้าย แล้วพิมพ์ไปติดที่จุดต่างๆ" />;
  }

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-zinc-500">
          {selected.size > 0 ? `เลือก ${selected.size} จาก ${stickers.length} รายการ` : `ทั้งหมด ${stickers.length} รายการ`}
        </p>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button type="button" className="btn-ghost" onClick={() => setSelected(new Set())}>
              ล้างที่เลือก
            </button>
          )}
          <button type="button" className="btn-primary" onClick={() => window.print()}>
            <Printer className="size-4" />
            {selected.size > 0 ? "พิมพ์ที่เลือก" : "พิมพ์ทั้งหมด"}
          </button>
        </div>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-3 print:gap-3">
        {stickers.map((s) => {
          const isSelected = selected.has(s.id);
          const hideInPrint = selected.size > 0 && !isSelected;
          return (
            <li key={s.id} className={`break-inside-avoid ${hideInPrint ? "print:hidden" : ""}`}>
              <div
                className={`card relative flex flex-col items-center p-5 text-center transition print:rounded-xl print:border-dashed print:shadow-none ${
                  isSelected ? "border-zinc-900 ring-1 ring-zinc-900" : ""
                }`}
              >
                <label className="absolute top-3 left-3 flex cursor-pointer items-center print:hidden">
                  <input
                    type="checkbox"
                    className="size-4 accent-zinc-900"
                    checked={isSelected}
                    onChange={() => toggle(s.id)}
                    aria-label={`เลือกพิมพ์ ${s.place}`}
                  />
                </label>
                <div className="mb-3 flex items-center gap-2">
                  <BrandMark className="size-6 rounded-md" />
                  <span className="text-xs font-semibold text-zinc-900">สแกนเพื่อแจ้งซ่อม</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element -- generated SVG data URI */}
                <img src={s.qr} alt={`QR Code แจ้งซ่อม ${s.place}`} className="size-40 print:size-36" />
                <p className="mt-3 line-clamp-2 text-sm font-semibold text-zinc-900">{s.equipment ?? s.place}</p>
                {s.equipment && <p className="line-clamp-2 text-xs text-zinc-600">{s.place}</p>}
                {s.assetNumber && <p className="mt-0.5 font-mono text-[11px] text-zinc-500">ครุภัณฑ์ {s.assetNumber}</p>}
                <p className="mt-2 font-mono text-[10px] text-zinc-400">{s.id}</p>

                <div className="mt-4 flex w-full items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500 print:hidden">
                  <span>{s.uses > 0 ? `แจ้งผ่าน QR นี้ ${s.uses} ครั้ง` : "ยังไม่เคยถูกใช้"}</span>
                  <span className="flex gap-1">
                    <a href={s.url} target="_blank" rel="noreferrer" className="btn-icon size-8" title="ทดลองเปิดลิงก์" aria-label="ทดลองเปิดลิงก์">
                      <ExternalLink className="size-3.5" />
                    </a>
                    <button
                      type="button"
                      className="btn-icon size-8 hover:bg-rose-50 hover:text-rose-600"
                      disabled={pending}
                      onClick={() => {
                        if (confirm("ลบ QR Code นี้? สติกเกอร์ที่พิมพ์ไปแล้วจะใช้งานไม่ได้")) {
                          startTransition(async () => {
                            await deleteQrTag(s.id);
                          });
                        }
                      }}
                      title="ลบ"
                      aria-label="ลบ QR Code"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
