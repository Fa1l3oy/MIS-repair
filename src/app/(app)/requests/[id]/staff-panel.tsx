"use client";

import {
  CircleCheck,
  CirclePause,
  CircleX,
  Hand,
  LoaderCircle,
  UserCheck,
  UserCog,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { MAX_UPLOAD_BYTES, PhotoPicker, totalPhotoBytes, type PickedPhoto } from "@/components/photo-picker";
import { Alert } from "@/components/ui/alert";
import type { RequestStatus, Role } from "@/generated/prisma/enums";
import { CLOSED_STATUSES, STATUS_LABEL } from "@/lib/labels";
import { STAFF_TRANSITIONS } from "@/lib/workflow";
import { acceptRequest, assignRequest, updateRequestStatus } from "./staff-actions";

type Person = { id: string; name: string };

type Props = {
  requestId: string;
  status: RequestStatus;
  assignee: Person | null;
  viewer: { id: string; role: Role };
  technicians: Person[];
};

const OPTION_LOOK: Partial<Record<RequestStatus, { icon: LucideIcon; hint: string; accent: string }>> = {
  ACCEPTED: { icon: UserCheck, hint: "รับผิดชอบงานนี้", accent: "text-brand-600" },
  IN_PROGRESS: { icon: Wrench, hint: "เริ่มซ่อม / กำลังแก้ไข", accent: "text-amber-600" },
  ON_HOLD: { icon: CirclePause, hint: "รออะไหล่หรือพักงานชั่วคราว", accent: "text-orange-600" },
  COMPLETED: { icon: CircleCheck, hint: "ซ่อมเสร็จ ใช้งานได้ปกติ", accent: "text-emerald-600" },
  REJECTED: { icon: CircleX, hint: "ต้องระบุเหตุผลให้ผู้แจ้งทราบ", accent: "text-rose-600" },
};

export function StaffPanel({ requestId, status, assignee, viewer, technicians }: Props) {
  const [result, setResult] = useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = useTransition();
  const isAdmin = viewer.role === "ADMIN";
  const closed = CLOSED_STATUSES.includes(status);
  const canManage = isAdmin || !assignee || assignee.id === viewer.id;

  function run(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    startTransition(async () => {
      try {
        const res = await fn();
        setResult({ ok: res.ok, text: (res.ok ? res.message : res.error) ?? (res.ok ? "บันทึกแล้ว" : "เกิดข้อผิดพลาด") });
      } catch {
        // e.g. network loss, or the host rejecting an oversized upload (HTTP 413)
        setResult({ ok: false, text: "ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง (รูปอาจมีขนาดใหญ่เกินไป)" });
      }
    });
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-zinc-100 bg-zinc-50/60 px-5 py-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-zinc-900 text-white">
          <Wrench className="size-[18px]" strokeWidth={2} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">การดำเนินงานของช่าง</h2>
          <p className="text-xs text-zinc-500">อัปเดตสถานะเพื่อแจ้งผู้แจ้งซ่อม</p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {result && <Alert tone={result.ok ? "success" : "error"}>{result.text}</Alert>}

        {closed && <p className="text-sm text-zinc-500">งานนี้ปิดแล้ว ({STATUS_LABEL[status]})</p>}

        {!closed && status === "PENDING" && !assignee && (
          <button
            type="button"
            className="btn-primary h-12 w-full text-base"
            disabled={pending}
            onClick={() => run(() => acceptRequest(requestId))}
          >
            {pending ? <LoaderCircle className="size-5 animate-spin" /> : <Hand className="size-5" strokeWidth={2} />}
            รับงานนี้
          </button>
        )}

        {!closed && !canManage && assignee && (
          <Alert tone="info">
            งานนี้อยู่ในความรับผิดชอบของ <strong className="font-semibold">{assignee.name}</strong>
          </Alert>
        )}

        {!closed && canManage && (
          <StatusForm
            key={status}
            requestId={requestId}
            status={status}
            pending={pending}
            onSubmit={(fd) => run(() => updateRequestStatus(fd))}
          />
        )}

        {!closed && isAdmin && (
          <AssignForm
            requestId={requestId}
            assignee={assignee}
            technicians={technicians}
            pending={pending}
            onAssign={(id) => run(() => assignRequest(requestId, id))}
          />
        )}
      </div>
    </section>
  );
}

function StatusForm({
  requestId,
  status,
  pending,
  onSubmit,
}: {
  requestId: string;
  status: RequestStatus;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
}) {
  // For a pending job "accept" is the big button above; the form only offers rejection.
  const options = STAFF_TRANSITIONS[status].filter((s) => !(status === "PENDING" && s === "ACCEPTED"));
  const [next, setNext] = useState<RequestStatus | "">(options.length === 1 ? options[0] : "");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [open, setOpen] = useState(status !== "PENDING");
  const tooLarge = next !== "REJECTED" && totalPhotoBytes(photos) > MAX_UPLOAD_BYTES;

  if (!open) {
    return (
      <button
        type="button"
        className="btn-ghost w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700"
        onClick={() => setOpen(true)}
      >
        <CircleX className="size-4" strokeWidth={2} />
        ไม่สามารถดำเนินการได้
      </button>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (tooLarge) return;
        const fd = new FormData();
        fd.set("requestId", requestId);
        fd.set("status", next);
        fd.set("note", note);
        // Photos are hidden (and not sent) when rejecting a job.
        if (next !== "REJECTED") photos.forEach((p) => fd.append("photos", p.file));
        onSubmit(fd);
      }}
    >
      <fieldset>
        <legend className="label">อัปเดตสถานะเป็น</legend>
        <div className="grid gap-2">
          {options.map((s) => {
            const look = OPTION_LOOK[s];
            const Icon = look?.icon ?? Wrench;
            return (
              <label
                key={s}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 px-3.5 py-2.5 transition hover:border-zinc-300 has-checked:border-zinc-900 has-checked:bg-zinc-50 has-checked:ring-1 has-checked:ring-zinc-900 has-focus-visible:ring-4 has-focus-visible:ring-zinc-900/10"
              >
                <input
                  type="radio"
                  name="status"
                  value={s}
                  checked={next === s}
                  onChange={() => setNext(s)}
                  className="sr-only"
                />
                <Icon className={`size-[18px] shrink-0 ${look?.accent ?? "text-zinc-500"}`} strokeWidth={2} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block text-sm font-medium text-zinc-900">{STATUS_LABEL[s]}</span>
                  {look && <span className="block text-xs text-zinc-500">{look.hint}</span>}
                </span>
                <span
                  aria-hidden
                  className={`size-4 shrink-0 rounded-full border-2 transition ${
                    next === s ? "border-zinc-900 bg-zinc-900 shadow-[inset_0_0_0_3px_white]" : "border-zinc-300"
                  }`}
                />
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="staff-note" className="label">
          บันทึกการดำเนินงาน{next === "REJECTED" && <span className="text-rose-500"> * (ระบุเหตุผล)</span>}
        </label>
        <textarea
          id="staff-note"
          rows={3}
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            next === "COMPLETED"
              ? "เช่น เปลี่ยนคาปาซิเตอร์ ล้างแผงคอยล์ ทดสอบใช้งานได้ปกติ"
              : next === "ON_HOLD"
                ? "เช่น รออะไหล่จากบริษัท คาดว่าได้รับภายใน 3 วัน"
                : "รายละเอียดการดำเนินงาน"
          }
        />
      </div>

      {next !== "REJECTED" && (
        <div>
          <p className="label">แนบรูปหลังซ่อม / ความคืบหน้า</p>
          <PhotoPicker photos={photos} onChange={setPhotos} />
          {tooLarge && (
            <p className="mt-1.5 text-xs font-medium text-rose-600">รูปภาพรวมกันมีขนาดใหญ่เกิน 4 MB กรุณาลดจำนวนรูป</p>
          )}
        </div>
      )}

      <button
        type="submit"
        className={`${next === "REJECTED" ? "btn-danger" : "btn-primary"} h-11 w-full`}
        disabled={pending || !next || tooLarge || (next === "REJECTED" && !note.trim())}
      >
        {pending && <LoaderCircle className="size-4 animate-spin" />}
        {pending ? "กำลังบันทึก..." : "บันทึกสถานะ"}
      </button>
    </form>
  );
}

function AssignForm({
  requestId,
  assignee,
  technicians,
  pending,
  onAssign,
}: {
  requestId: string;
  assignee: Person | null;
  technicians: Person[];
  pending: boolean;
  onAssign: (id: string) => void;
}) {
  const [selected, setSelected] = useState(assignee?.id ?? "");
  return (
    <div className="space-y-2 border-t border-zinc-100 pt-4">
      <label htmlFor={`assign-${requestId}`} className="label flex items-center gap-1.5">
        <UserCog className="size-4 text-zinc-400" strokeWidth={2} />
        มอบหมายงานให้ช่าง
      </label>
      <div className="flex gap-2">
        <select
          id={`assign-${requestId}`}
          className="input"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="" disabled>
            เลือกช่าง
          </option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-secondary h-auto shrink-0"
          disabled={pending || !selected || selected === assignee?.id}
          onClick={() => onAssign(selected)}
        >
          มอบหมาย
        </button>
      </div>
    </div>
  );
}
