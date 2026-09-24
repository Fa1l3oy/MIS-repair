import { BellRing, Camera, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/shell/brand-mark";
import { getSession } from "@/lib/session";

const FEATURES = [
  { icon: Camera, title: "แจ้งซ่อมได้ในไม่กี่ขั้นตอน", text: "ถ่ายรูปจากมือถือ ระบุสถานที่ แล้วส่งถึงช่างทันที" },
  { icon: BellRing, title: "ติดตามได้ทุกขั้นตอน", text: "รู้ทันทีเมื่อช่างรับงาน กำลังซ่อม หรือซ่อมเสร็จ" },
  { icon: ShieldCheck, title: "ข้อมูลปลอดภัย", text: "เห็นเฉพาะผู้เกี่ยวข้อง ตามสิทธิ์การใช้งาน" },
];

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  if (session?.user?.active) redirect("/");

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden bg-zinc-950 p-12 text-white lg:flex lg:flex-col">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_10%,rgb(99_102_241/0.45),transparent),radial-gradient(50%_40%_at_90%_90%,rgb(139_92_246/0.35),transparent)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:48px_48px]"
        />
        <div className="relative flex items-center gap-3">
          <BrandMark className="size-10" />
          <span className="leading-tight">
            <span className="block font-semibold tracking-tight">Repair MIS</span>
            <span className="block text-sm text-white/60">ระบบแจ้งซ่อม</span>
          </span>
        </div>

        <div className="relative my-auto max-w-md py-12">
          <h1 className="text-4xl leading-tight font-semibold tracking-tight">
            แจ้งซ่อมง่าย
            <br />
            <span className="bg-linear-to-r from-brand-300 to-violet-300 bg-clip-text text-transparent">
              ติดตามได้ทุกขั้นตอน
            </span>
          </h1>
          <p className="mt-4 text-white/60">ระบบบริหารงานซ่อมบำรุงสำหรับผู้ใช้งาน ช่างซ่อมบำรุง และผู้ดูแลระบบ</p>
          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
                  <Icon className="size-5 text-white/90" strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="block text-sm text-white/55">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} Repair MIS</p>
      </section>

      {/* Form panel */}
      <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark className="size-10" />
            <span className="leading-tight">
              <span className="block font-semibold tracking-tight text-zinc-900">Repair MIS</span>
              <span className="block text-sm text-zinc-500">ระบบแจ้งซ่อม</span>
            </span>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
