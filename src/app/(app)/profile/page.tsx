import type { Metadata } from "next";
import { RoleBadge } from "@/components/badges";
import { PageHeader } from "@/components/page-header";
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
    <div className="mx-auto max-w-3xl">
      <PageHeader title="โปรไฟล์ของฉัน" description={`สมาชิกตั้งแต่ ${formatDateTime(user.createdAt)}`} />
      <div className="mb-5 flex items-center gap-2 text-sm text-slate-600">
        สิทธิ์การใช้งาน: <RoleBadge role={user.role} />
        <span className="text-xs text-slate-400">(เปลี่ยนสิทธิ์ได้โดยผู้ดูแลระบบเท่านั้น)</span>
      </div>
      <div className="space-y-6">
        <ProfileForm profile={user} />
        <PasswordForm />
      </div>
    </div>
  );
}
