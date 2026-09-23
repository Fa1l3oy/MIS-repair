"use client";

import { useState, useTransition } from "react";
import { addComment } from "./actions";

export function CommentForm({ requestId }: { requestId: string }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await addComment(requestId, text);
      if (!res.ok) return setError(res.error);
      setText("");
      setError(undefined);
    });
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-2 border-t border-slate-100 pt-4">
      <label htmlFor="comment" className="label">
        เพิ่มความคิดเห็น / สอบถาม
      </label>
      <textarea
        id="comment"
        rows={2}
        className="input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="พิมพ์ข้อความถึงผู้แจ้งหรือช่าง..."
      />
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="flex justify-end">
        <button type="submit" className="btn-secondary" disabled={pending || !text.trim()}>
          {pending ? "กำลังส่ง..." : "ส่งข้อความ"}
        </button>
      </div>
    </form>
  );
}
