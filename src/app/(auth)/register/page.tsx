import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "สมัครสมาชิก" };

export default function RegisterPage() {
  return (
    <>
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">สร้างบัญชีใหม่</h2>
      <p className="mt-1.5 mb-8 text-sm text-zinc-500">สมัครเพื่อแจ้งซ่อมและติดตามสถานะงานได้ทุกที่</p>
      <RegisterForm />
      <p className="mt-8 text-center text-sm text-zinc-500">
        มีบัญชีอยู่แล้ว?{" "}
        <Link href="/login" className="font-medium text-zinc-900 underline-offset-4 hover:underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </>
  );
}
