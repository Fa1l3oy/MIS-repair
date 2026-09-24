"use client";

import { Ban, LoaderCircle, Star } from "lucide-react";
import { useState, useTransition } from "react";
import { cancelRequest, rateRequest } from "./actions";

const RATING_WORDS = ["", "ต้องปรับปรุง", "พอใช้", "ดี", "ดีมาก", "ยอดเยี่ยม"];

export function CancelRequestButton({ requestId }: { requestId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700"
      >
        <Ban className="size-4" strokeWidth={2} />
        ยกเลิกใบแจ้งซ่อม
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-zinc-900">ยืนยันการยกเลิก?</p>
        <p className="text-xs text-zinc-500">ช่างจะหยุดดำเนินการกับงานนี้</p>
      </div>
      <textarea
        aria-label="เหตุผลที่ยกเลิก"
        rows={2}
        className="input"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="เหตุผล (ถ้ามี) เช่น แจ้งซ้ำ / อุปกรณ์ใช้งานได้แล้ว"
      />
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
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
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          ยืนยันยกเลิก
        </button>
      </div>
    </div>
  );
}

export function RatingStars({ value, className = "size-5" }: { value: number; className?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} จาก 5 ดาว`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${className} ${n <= value ? "fill-amber-400 text-amber-400" : "fill-zinc-100 text-zinc-200"}`}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

export function RatingForm({ requestId }: { requestId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const shown = hover || rating;

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">งานซ่อมเสร็จแล้ว ช่วยประเมินความพึงพอใจหน่อยนะครับ</p>
      <div>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              className="rounded-lg p-0.5 transition hover:scale-110 focus-visible:ring-4 focus-visible:ring-amber-400/30 focus-visible:outline-none"
              aria-label={`${n} ดาว`}
              aria-pressed={rating === n}
            >
              <Star
                className={`size-8 ${shown >= n ? "fill-amber-400 text-amber-400" : "fill-zinc-100 text-zinc-300"}`}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>
        <p className="mt-1 h-5 text-sm font-medium text-amber-600">{RATING_WORDS[shown]}</p>
      </div>
      <textarea
        aria-label="ข้อเสนอแนะ"
        rows={2}
        className="input"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="ข้อเสนอแนะเพิ่มเติม (ถ้ามี)"
      />
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
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
        {pending && <LoaderCircle className="size-4 animate-spin" />}
        ส่งการประเมิน
      </button>
    </div>
  );
}
