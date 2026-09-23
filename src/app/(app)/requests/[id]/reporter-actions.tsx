"use client";

import { useState, useTransition } from "react";
import { cancelRequest, rateRequest } from "./actions";

export function CancelRequestButton({ requestId }: { requestId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary w-full text-rose-600">
        ยกเลิกใบแจ้งซ่อม
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50/50 p-3">
      <label htmlFor="cancel-reason" className="label">
        เหตุผลที่ยกเลิก (ถ้ามี)
      </label>
      <textarea
        id="cancel-reason"
        rows={2}
        className="input"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="เช่น แจ้งซ้ำ / อุปกรณ์กลับมาใช้งานได้แล้ว"
      />
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-secondary flex-1" onClick={() => setOpen(false)} disabled={pending}>
          ไม่ยกเลิก
        </button>
        <button
          type="button"
          className="btn-danger flex-1"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await cancelRequest(requestId, reason);
              if (!res.ok) setError(res.error);
              else setOpen(false);
            })
          }
        >
          {pending ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}
        </button>
      </div>
    </div>
  );
}

export function RatingForm({ requestId }: { requestId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">งานซ่อมเสร็จแล้ว กรุณาประเมินความพึงพอใจ</p>
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            className={`text-3xl leading-none transition ${(hover || rating) >= n ? "text-amber-400" : "text-slate-300"}`}
            aria-label={`${n} ดาว`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        rows={2}
        className="input"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="ข้อเสนอแนะเพิ่มเติม (ถ้ามี)"
      />
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <button
        type="button"
        className="btn-primary w-full"
        disabled={pending || rating === 0}
        onClick={() =>
          startTransition(async () => {
            const res = await rateRequest(requestId, { rating, feedback });
            if (!res.ok) setError(res.error);
          })
        }
      >
        {pending ? "กำลังบันทึก..." : "ส่งการประเมิน"}
      </button>
    </div>
  );
}
