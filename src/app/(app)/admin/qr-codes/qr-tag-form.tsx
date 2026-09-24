"use client";

import { LoaderCircle, QrCode } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { FieldError } from "@/components/field-error";
import { Alert } from "@/components/ui/alert";
import type { FieldErrors } from "@/lib/validation";
import { createQrTag } from "./actions";

type Option = { id: string; name: string };

export function QrTagForm({ buildings, categories }: { buildings: Option[]; categories: Option[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      noValidate
      className="card space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await createQrTag(fd);
          setFieldErrors(res.ok ? {} : (res.fieldErrors ?? {}));
          setFeedback({ ok: res.ok, text: (res.ok ? res.message : res.error) ?? "" });
          if (res.ok) {
            // Keep building / floor for the next sticker in the same area.
            const form = formRef.current;
            if (form) for (const name of ["location", "equipment", "assetNumber"]) (form.elements.namedItem(name) as HTMLInputElement).value = "";
          }
        });
      }}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
          <QrCode className="size-[18px]" strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">สร้าง QR ใหม่</h2>
          <p className="text-xs text-zinc-500">ข้อมูลนี้จะถูกกรอกในฟอร์มให้อัตโนมัติ</p>
        </div>
      </div>

      {feedback && <Alert tone={feedback.ok ? "success" : "error"}>{feedback.text}</Alert>}

      <div>
        <label htmlFor="qr-building" className="label">
          อาคาร <span className="text-rose-500">*</span>
        </label>
        <select id="qr-building" name="buildingId" className="input" defaultValue="">
          <option value="" disabled>
            เลือกอาคาร
          </option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <FieldError errors={fieldErrors.buildingId} />
      </div>
      <div className="grid grid-cols-[88px_1fr] gap-3">
        <div>
          <label htmlFor="qr-floor" className="label">
            ชั้น
          </label>
          <input id="qr-floor" name="floor" className="input" inputMode="numeric" />
        </div>
        <div>
          <label htmlFor="qr-location" className="label">
            ห้อง / จุดที่ตั้ง <span className="text-rose-500">*</span>
          </label>
          <input id="qr-location" name="location" className="input" placeholder="เช่น ห้อง 301" />
          <FieldError errors={fieldErrors.location} />
        </div>
      </div>
      <div>
        <label htmlFor="qr-equipment" className="label">
          อุปกรณ์ <span className="font-normal text-zinc-400">(ถ้าเป็น QR ของครุภัณฑ์)</span>
        </label>
        <input id="qr-equipment" name="equipment" className="input" placeholder="เช่น เครื่องปรับอากาศ 24000 BTU" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="qr-asset" className="label">
            เลขครุภัณฑ์
          </label>
          <input id="qr-asset" name="assetNumber" className="input" />
        </div>
        <div>
          <label htmlFor="qr-category" className="label">
            ประเภทงาน
          </label>
          <select id="qr-category" name="categoryId" className="input" defaultValue="">
            <option value="">ไม่ระบุ</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <QrCode className="size-4" />}
        สร้าง QR Code
      </button>
    </form>
  );
}
