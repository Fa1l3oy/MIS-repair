import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { safeInternalPath } from "@/lib/safe-path";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { callbackUrl, error, registered } = await searchParams;
  const initialError =
    error === "inactive" ? "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" : undefined;

  return (
    <>
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">ยินดีต้อนรับกลับ</h2>
      <p className="mt-1.5 mb-8 text-sm text-zinc-500">เข้าสู่ระบบเพื่อแจ้งซ่อมและติดตามงานของคุณ</p>
      {registered && (
        <Alert tone="success" className="mb-4">
          สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ
        </Alert>
      )}
      <LoginForm callbackUrl={safeInternalPath(callbackUrl)} initialError={initialError} />
      <p className="mt-8 text-center text-sm text-zinc-500">
        ยังไม่มีบัญชี?{" "}
        <Link href="/register" className="font-medium text-zinc-900 underline-offset-4 hover:underline">
          สมัครสมาชิก
        </Link>
      </p>
    </>
  );
}
