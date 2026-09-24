import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
        <SearchX className="size-7" strokeWidth={1.75} />
      </span>
      <p className="text-sm font-medium text-brand-600">404</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">ไม่พบหน้าที่คุณต้องการ</h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">หน้านี้อาจถูกลบไปแล้ว หรือคุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้</p>
      <Link href="/" className="btn-primary mt-6">
        <ArrowLeft className="size-4" />
        กลับหน้าหลัก
      </Link>
    </main>
  );
}
