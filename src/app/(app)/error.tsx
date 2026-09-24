"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card mx-auto mt-10 flex max-w-md flex-col items-center p-8 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
        <TriangleAlert className="size-6" strokeWidth={1.75} />
      </span>
      <h1 className="text-lg font-semibold text-zinc-900">เกิดข้อผิดพลาด</h1>
      <p className="mt-1 text-sm text-zinc-500">ไม่สามารถโหลดข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-zinc-400">รหัสอ้างอิง: {error.digest}</p>}
      <button type="button" onClick={() => retry()} className="btn-primary mt-5">
        <RotateCw className="size-4" />
        ลองใหม่
      </button>
    </div>
  );
}
