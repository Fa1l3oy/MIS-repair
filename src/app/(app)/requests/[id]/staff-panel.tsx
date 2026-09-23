"use client";

import { useState, useTransition } from "react";
import { PhotoPicker, type PickedPhoto } from "@/components/photo-picker";
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

function Feedback({ result }: { result?: { ok: boolean; text: string } }) {
  if (!result) return null;
  return (
    <p
      className={`rounded-lg px-3 py-2 text-sm ${result.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
    >
      {result.text}
    </p>
  );
}

export function StaffPanel({ requestId, status, assignee, viewer, technicians }: Props) {
  const [result, setResult] = useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = useTransition();
  const isAdmin = viewer.role === "ADMIN";
  const closed = CLOSED_STATUSES.includes(status);
  const canManage = isAdmin || !assignee || assignee.id === viewer.id;

  function run(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    startTransition(async () => {
      const res = await fn();
      setResult({ ok: res.ok, text: (res.ok ? res.message : res.error) ?? (res.ok ? "บันทึกแล้ว" : "เกิดข้อผิดพลาด") });
    });
  }

  return (
    <section className="card border-indigo-200 p-5 ring-1 ring-indigo-100">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-indigo-900">🔧 การดำเนินงานของช่าง</h2>
      <div className="space-y-4">
        <Feedback result={result} />

        {closed && <p className="text-sm text-slate-500">งานนี้ปิดแล้ว ({STATUS_LABEL[status]})</p>}

        {!closed && status === "PENDING" && !assignee && (
          <button
            type="button"
            className="btn-primary w-full py-3 text-base"
            disabled={pending}
            onClick={() => run(() => acceptRequest(requestId))}
          >
            ✋ รับงานนี้
          </button>
        )}

        {!closed && !canManage && assignee && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            งานนี้อยู่ในความรับผิดชอบของ <strong>{assignee.name}</strong>
          </p>
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

  if (!open) {
    return (
      <button type="button" className="btn-secondary w-full text-rose-600" onClick={() => setOpen(true)}>
        ไม่สามารถดำเนินการได้
      </button>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.set("requestId", requestId);
        fd.set("status", next);
        fd.set("note", note);
        photos.forEach((p) => fd.append("photos", p.file));
        onSubmit(fd);
      }}
    >
      <fieldset>
        <legend className="label">อัปเดตสถานะเป็น</legend>
        <div className="grid gap-2">
          {options.map((s) => (
            <label
              key={s}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm has-checked:border-indigo-500 has-checked:bg-indigo-50"
            >
              <input
                type="radio"
                name="status"
                value={s}
                checked={next === s}
                onChange={() => setNext(s)}
                className="accent-indigo-600"
              />
              {STATUS_LABEL[s]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="staff-note" className="label">
          บันทึกการดำเนินงาน{next === "REJECTED" ? " (ระบุเหตุผล) *" : ""}
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
        </div>
      )}

      <button
        type="submit"
        className={next === "REJECTED" ? "btn-danger w-full" : "btn-primary w-full"}
        disabled={pending || !next || (next === "REJECTED" && !note.trim())}
      >
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
    <div className="space-y-2 border-t border-slate-100 pt-4">
      <label htmlFor={`assign-${requestId}`} className="label">
        มอบหมายงานให้ช่าง (ผู้ดูแลระบบ)
      </label>
      <div className="flex gap-2">
        <select
          id={`assign-${requestId}`}
          className="input"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="" disabled>
            -- เลือกช่าง --
          </option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-secondary shrink-0"
          disabled={pending || !selected || selected === assignee?.id}
          onClick={() => onAssign(selected)}
        >
          มอบหมาย
        </button>
      </div>
    </div>
  );
}
