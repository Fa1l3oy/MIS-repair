import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "สมัครสมาชิก" };

export default function RegisterPage() {
  return (
    <>
      <h2 className="mb-1 text-xl font-semibold">สมัครสมาชิก</h2>
      <p className="mb-6 text-sm text-slate-500">สร้างบัญชีเพื่อแจ้งซ่อมและติดตามงาน</p>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-slate-500">
        มีบัญชีอยู่แล้ว?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </>
  );
}
