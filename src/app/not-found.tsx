import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-5xl">🔍</p>
      <h1 className="text-xl font-bold text-slate-900">ไม่พบหน้าที่คุณต้องการ</h1>
      <p className="max-w-sm text-sm text-slate-500">
        หน้านี้อาจถูกลบ หรือคุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้
      </p>
      <Link href="/" className="btn-primary mt-2">
        กลับหน้าหลัก
      </Link>
    </main>
  );
}
