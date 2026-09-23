import type { Metadata } from "next";
import Link from "next/link";
import { safeInternalPath } from "@/lib/safe-path";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { callbackUrl, error, registered } = await searchParams;
  const initialError =
    error === "inactive" ? "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" : undefined;

  return (
    <>
      <h2 className="mb-1 text-xl font-semibold">เข้าสู่ระบบ</h2>
      <p className="mb-6 text-sm text-slate-500">กรอกอีเมลและรหัสผ่านเพื่อใช้งานระบบ</p>
      {registered && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ
        </p>
      )}
      <LoginForm
        callbackUrl={safeInternalPath(callbackUrl)}
        initialError={initialError}
      />
      <p className="mt-6 text-center text-sm text-slate-500">
        ยังไม่มีบัญชี?{" "}
        <Link href="/register" className="font-medium text-indigo-600 hover:underline">
          สมัครสมาชิก
        </Link>
      </p>
    </>
  );
}
