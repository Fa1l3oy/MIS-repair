"use client";

import { Camera, FileText, LoaderCircle, MapPin, Package, Send, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FieldError } from "@/components/field-error";
import { MAX_UPLOAD_BYTES, PhotoPicker, totalPhotoBytes, type PickedPhoto } from "@/components/photo-picker";
import { Alert } from "@/components/ui/alert";
import { PRIORITY_DOT, PRIORITY_LABEL } from "@/lib/labels";
import { FLOOR, LEN } from "@/lib/limits";
import { PRIORITIES, type FieldErrors } from "@/lib/validation";
import { createRepairRequest } from "./actions";

type Option = { id: string; name: string };

/** Values to pre-fill, e.g. from a scanned QR sticker or an earlier request. */
export type Prefill = {
  buildingId?: string | null;
  floor?: number | null;
  location?: string | null;
  equipment?: string | null;
  assetNumber?: string | null;
  categoryId?: string | null;
  qrTagId?: string | null;
};

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
          <Icon className="size-[18px]" strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="font-semibold text-zinc-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function RepairRequestForm({
  buildings,
  categories,
  prefill = {},
}: {
  buildings: Option[];
  categories: Option[];
  prefill?: Prefill;
}) {
  // Only pre-select options that are still offered in the form.
  const buildingDefault = buildings.some((b) => b.id === prefill.buildingId) ? prefill.buildingId! : "";
  const categoryDefault = categories.some((c) => c.id === prefill.categoryId) ? prefill.categoryId! : "";
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
      {error && <Alert tone="error">{error}</Alert>}
      {prefill.qrTagId && <input type="hidden" name="qrTagId" value={prefill.qrTagId} />}

      <Section icon={Camera} title="รูปภาพความเสียหาย" description="ถ่ายให้เห็นอุปกรณ์และจุดที่เสียชัดเจน อย่างน้อย 1 รูป">
        <PhotoPicker photos={photos} onChange={setPhotos} />
        <FieldError errors={fieldErrors.photos} />
      </Section>

      <Section icon={Package} title="ข้อมูลอุปกรณ์">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="equipment" className="label">
              อุปกรณ์ที่เสียหาย <span className="text-rose-500">*</span>
            </label>
            <input
              id="equipment"
              name="equipment"
              className="input"
              minLength={LEN.equipment[0]}
              maxLength={LEN.equipment[1]}
              placeholder="เช่น เครื่องปรับอากาศ, หลอดไฟ, ก๊อกน้ำ"
              defaultValue={prefill.equipment ?? ""}
            />
            <FieldError errors={fieldErrors.equipment} />
          </div>
          <div>
            <label htmlFor="categoryId" className="label">
              ประเภทงาน <span className="text-rose-500">*</span>
            </label>
            <select id="categoryId" name="categoryId" className="input" defaultValue={categoryDefault}>
              <option value="" disabled>
                เลือกประเภทงาน
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
              เลขครุภัณฑ์ <span className="font-normal text-zinc-400">(ถ้ามี)</span>
            </label>
            <input
              id="assetNumber"
              name="assetNumber"
              className="input"
              maxLength={LEN.assetNumber[1]}
              placeholder="เช่น 7440-001-0001"
              defaultValue={prefill.assetNumber ?? ""}
            />
            <FieldError errors={fieldErrors.assetNumber} />
          </div>
          <fieldset className="sm:col-span-2">
            <legend className="label">ความเร่งด่วน</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRIORITIES.map((p) => (
                <label
                  key={p}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-600 transition hover:border-zinc-300 has-checked:border-zinc-900 has-checked:bg-zinc-900 has-checked:text-white has-focus-visible:ring-4 has-focus-visible:ring-zinc-900/10"
                >
                  <input type="radio" name="priority" value={p} defaultChecked={p === "MEDIUM"} className="sr-only" />
                  <span className={`size-2 rounded-full ${PRIORITY_DOT[p]}`} aria-hidden />
                  {PRIORITY_LABEL[p]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Section>

      <Section icon={MapPin} title="สถานที่">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="buildingId" className="label">
              อาคาร / ตึก <span className="text-rose-500">*</span>
            </label>
            <select id="buildingId" name="buildingId" className="input" defaultValue={buildingDefault}>
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
          <div>
            <label htmlFor="floor" className="label">
              ชั้น
            </label>
            <input
              id="floor"
              name="floor"
              type="number"
              min={FLOOR.min}
              max={FLOOR.max}
              step={1}
              className="input"
              placeholder="เช่น 3"
              title="ชั้นใต้ดินใส่ติดลบ เช่น -1 = B1, 0 = G"
              defaultValue={prefill.floor ?? ""}
            />
            <FieldError errors={fieldErrors.floor} />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="location" className="label">
              ห้อง / จุดที่ตั้ง <span className="text-rose-500">*</span>
            </label>
            <input
              id="location"
              name="location"
              className="input"
              minLength={LEN.location[0]}
              maxLength={LEN.location[1]}
              placeholder="เช่น ห้อง 301, ห้องน้ำชายฝั่งทิศเหนือ"
              defaultValue={prefill.location ?? ""}
            />
            <FieldError errors={fieldErrors.location} />
          </div>
        </div>
      </Section>

      <Section icon={FileText} title="รายละเอียดปัญหา">
        <label htmlFor="description" className="label">
          อาการเสีย / รายละเอียดเพิ่มเติม <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          minLength={LEN.description[0]}
          maxLength={LEN.description[1]}
          className="input resize-y"
          placeholder="อธิบายอาการที่พบ เช่น เปิดไม่ติด มีน้ำรั่ว มีเสียงดังผิดปกติ ตั้งแต่เมื่อไร"
        />
        <FieldError errors={fieldErrors.description} />
      </Section>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => router.back()} className="btn-ghost" disabled={pending}>
          ยกเลิก
        </button>
        <button type="submit" className="btn-primary h-11 px-6" disabled={pending}>
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" strokeWidth={2} />}
          {pending ? "กำลังส่งแจ้งซ่อม..." : "บันทึกและส่งแจ้งซ่อม"}
        </button>
      </div>
    </form>
  );
}
