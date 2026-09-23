import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  if (session?.user?.active) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-sky-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-2xl text-white shadow-lg shadow-indigo-600/30">
            🛠️
          </div>
          <h1 className="text-2xl font-bold text-slate-900">ระบบแจ้งซ่อม</h1>
          <p className="text-sm text-slate-500">แจ้งปัญหา ติดตามสถานะ งานซ่อมบำรุง</p>
        </div>
        <div className="card p-6 sm:p-8">{children}</div>
      </div>
    </main>
  );
}
