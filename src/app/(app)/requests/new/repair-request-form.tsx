"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FieldError } from "@/components/field-error";
import { MAX_UPLOAD_BYTES, PhotoPicker, totalPhotoBytes, type PickedPhoto } from "@/components/photo-picker";
import { PRIORITY_LABEL } from "@/lib/labels";
import { PRIORITIES, type FieldErrors } from "@/lib/validation";
import { createRepairRequest } from "./actions";

type Option = { id: string; name: string };

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">
          {step}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function RepairRequestForm({ buildings, categories }: { buildings: Option[]; categories: Option[] }) {
  const router = useRouter();
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (totalPhotoBytes(photos) > MAX_UPLOAD_BYTES) {
      const msg = "รูปภาพรวมกันมีขนาดใหญ่เกิน 4 MB กรุณาลดจำนวนรูปหรือถ่ายใหม่";
      setError(msg);
      setFieldErrors({ photos: [msg] });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const formData = new FormData(e.currentTarget);
    formData.delete("photos");
    photos.forEach((p) => formData.append("photos", p.file));

    startTransition(async () => {
      try {
        const res = await createRepairRequest(formData);
        if (!res.ok) {
          setError(res.error);
          setFieldErrors(res.fieldErrors ?? {});
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        photos.forEach((p) => URL.revokeObjectURL(p.url));
        router.push(`/requests/${res.data?.id}?created=1`);
      } catch {
        setError("ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง (รูปอาจมีขนาดใหญ่เกินไป)");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">{error}</p>
      )}

      <Section step={1} title="รูปภาพความเสียหาย">
        <p className="mb-3 text-sm text-slate-500">
          ถ่ายรูปอุปกรณ์ที่เสียหายให้เห็นชัดเจน (อย่างน้อย 1 รูป สูงสุด 5 รูป)
        </p>
        <PhotoPicker photos={photos} onChange={setPhotos} />
        <FieldError errors={fieldErrors.photos} />
      </Section>

      <Section step={2} title="ข้อมูลอุปกรณ์">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="equipment" className="label">
              อุปกรณ์ที่เสียหาย *
            </label>
            <input
              id="equipment"
              name="equipment"
              className="input"
              placeholder="เช่น เครื่องปรับอากาศ, หลอดไฟ, ก๊อกน้ำ"
            />
            <FieldError errors={fieldErrors.equipment} />
          </div>
          <div>
            <label htmlFor="categoryId" className="label">
              ประเภทงาน *
            </label>
            <select id="categoryId" name="categoryId" className="input" defaultValue="">
              <option value="" disabled>
                -- เลือกประเภท --
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <FieldError errors={fieldErrors.categoryId} />
          </div>
          <div>
            <label htmlFor="assetNumber" className="label">
              เลขครุภัณฑ์ (ถ้ามี)
            </label>
            <input id="assetNumber" name="assetNumber" className="input" placeholder="เช่น 7440-001-0001" />
            <FieldError errors={fieldErrors.assetNumber} />
          </div>
          <fieldset className="sm:col-span-2">
            <legend className="label">ความเร่งด่วน</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRIORITIES.map((p) => (
                <label
                  key={p}
                  className="flex cursor-pointer items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm has-checked:border-indigo-600 has-checked:bg-indigo-50 has-checked:font-medium has-checked:text-indigo-700 has-focus-visible:ring-2 has-focus-visible:ring-indigo-500/30"
                >
                  <input type="radio" name="priority" value={p} defaultChecked={p === "MEDIUM"} className="sr-only" />
                  {PRIORITY_LABEL[p]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Section>

      <Section step={3} title="สถานที่">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="buildingId" className="label">
              อาคาร / ตึก *
            </label>
            <select id="buildingId" name="buildingId" className="input" defaultValue="">
              <option value="" disabled>
                -- เลือกอาคาร --
              </option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <FieldError errors={fieldErrors.buildingId} />
          </div>
          <div>
            <label htmlFor="floor" className="label">
              ชั้น
            </label>
            <input id="floor" name="floor" className="input" placeholder="เช่น 3" />
            <FieldError errors={fieldErrors.floor} />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="location" className="label">
              ห้อง / จุดที่ตั้ง *
            </label>
            <input
              id="location"
              name="location"
              className="input"
              placeholder="เช่น ห้อง 301, ห้องน้ำชายฝั่งทิศเหนือ"
            />
            <FieldError errors={fieldErrors.location} />
          </div>
        </div>
      </Section>

      <Section step={4} title="รายละเอียดปัญหา">
        <label htmlFor="description" className="label">
          อาการเสีย / รายละเอียดเพิ่มเติม *
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className="input"
          placeholder="อธิบายอาการที่พบ เช่น เปิดไม่ติด มีน้ำรั่ว มีเสียงดังผิดปกติ ตั้งแต่เมื่อไร"
        />
        <FieldError errors={fieldErrors.description} />
      </Section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => router.back()} className="btn-secondary" disabled={pending}>
          ยกเลิก
        </button>
        <button type="submit" className="btn-primary px-6" disabled={pending}>
          {pending ? "กำลังบันทึก..." : "บันทึกและส่งแจ้งซ่อม"}
        </button>
      </div>
    </form>
  );
}
