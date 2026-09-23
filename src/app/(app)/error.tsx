"use client";

import { useEffect } from "react";

export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <p className="text-4xl">⚠️</p>
      <h1 className="mt-2 text-lg font-bold text-slate-900">เกิดข้อผิดพลาด</h1>
      <p className="mt-1 text-sm text-slate-500">ไม่สามารถโหลดข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง</p>
      {error.digest && <p className="mt-1 font-mono text-xs text-slate-400">รหัสอ้างอิง: {error.digest}</p>}
      <button type="button" onClick={() => retry()} className="btn-primary mt-4">
        ลองใหม่
      </button>
    </div>
  );
}
