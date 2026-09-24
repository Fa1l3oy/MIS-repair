"use client";

import { LoaderCircle, SendHorizontal } from "lucide-react";
import { useState, useTransition } from "react";
import { LEN } from "@/lib/limits";
import { addComment } from "./actions";

export function CommentForm({ requestId }: { requestId: string }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    startTransition(async () => {
      const res = await addComment(requestId, text);
      if (!res.ok) return setError(res.error);
      setText("");
      setError(undefined);
    });
  }

  return (
    <form onSubmit={submit} className="mt-6 border-t border-zinc-100 pt-5">
      <label htmlFor="comment" className="sr-only">
        เพิ่มความคิดเห็น
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id="comment"
          rows={1}
          className="input field-sizing-content max-h-40 min-h-11 resize-none"
          value={text}
          maxLength={LEN.comment[1]}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl/⌘ + Enter sends; plain Enter keeps adding lines.
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(e);
          }}
          placeholder="พิมพ์ข้อความถึงผู้แจ้งหรือช่าง..."
        />
        <button
          type="submit"
          className="btn-primary size-11 shrink-0 px-0"
          disabled={pending || !text.trim()}
          aria-label="ส่งข้อความ"
          title="ส่งข้อความ (Ctrl+Enter)"
        >
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
    </form>
  );
}
