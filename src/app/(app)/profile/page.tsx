import { CalendarDays, Mail } from "lucide-react";
import type { Metadata } from "next";
import { RoleBadge } from "@/components/badges";
import { Avatar } from "@/components/ui/avatar";
import { formatDateTime } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { PasswordForm, ProfileForm } from "./profile-forms";

export const metadata: Metadata = { title: "โปรไฟล์ของฉัน" };

export default async function ProfilePage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: { name: true, email: true, phone: true, department: true, role: true, createdAt: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="card overflow-hidden">
        <div className="relative h-24 overflow-hidden bg-zinc-950">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(50%_120%_at_15%_0%,rgb(99_102_241/0.55),transparent),radial-gradient(40%_120%_at_85%_100%,rgb(139_92_246/0.45),transparent)]"
          />
        </div>
        <div className="px-5 pb-5 sm:px-6">
          <span className="-mt-7 mb-3 inline-block rounded-full ring-4 ring-white">
            <Avatar name={user.name} size="lg" />
          </span>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-900">{user.name}</h1>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-zinc-500">
                <Mail className="size-3.5" />
                {user.email}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RoleBadge role={user.role} />
              <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                <CalendarDays className="size-3.5" />
                สมาชิกตั้งแต่ {formatDateTime(user.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <ProfileForm profile={user} />
      <PasswordForm />
      <p className="text-center text-xs text-zinc-400">สิทธิ์การใช้งานเปลี่ยนได้โดยผู้ดูแลระบบเท่านั้น</p>
    </div>
  );
}
