import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import type { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { ROLE_LABEL } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ROLES } from "@/lib/validation";
import { CreateUserForm } from "./create-user-form";
import { UserRow } from "./user-row";

export const metadata: Metadata = { title: "จัดการผู้ใช้" };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const admin = await requireUser(["ADMIN"]);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.replaceAll("\0", "").trim() : ""; // PostgreSQL rejects NUL bytes
  const role = ROLES.find((r) => r === sp.role) as Role | undefined;

  const where: Prisma.UserWhereInput = {
    ...(role && { role }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { department: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  const [users, roleCounts] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        department: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            reportedRequests: true,
            assignedRequests: { where: { status: { in: ["ACCEPTED", "IN_PROGRESS", "ON_HOLD"] } } },
          },
        },
      },
    }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ]);
  const countFor = (r: Role) => roleCounts.find((c) => c.role === r)?._count._all ?? 0;

  return (
    <>
      <PageHeader title="จัดการผู้ใช้" description="กำหนดหรือเปลี่ยนสิทธิ์การใช้งาน ระงับบัญชี และเพิ่มผู้ใช้ใหม่" />

      <div className="mb-6 grid grid-cols-3 gap-3">
        {ROLES.map((r) => (
          <a
            key={r}
            href={role === r ? "/admin/users" : `/admin/users?role=${r}`}
            className={`card p-4 transition hover:border-indigo-300 ${role === r ? "border-indigo-400 ring-2 ring-indigo-100" : ""}`}
          >
            <p className="text-xs text-slate-500 sm:text-sm">{ROLE_LABEL[r]}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{countFor(r)}</p>
          </a>
        ))}
      </div>

      <CreateUserForm />

      <form className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row" action="/admin/users">
        <input
          name="q"
          defaultValue={q}
          className="input"
          placeholder="ค้นหาชื่อ, อีเมล, หน่วยงาน..."
          aria-label="ค้นหาผู้ใช้"
        />
        <select name="role" defaultValue={role ?? ""} className="input sm:w-56" aria-label="สิทธิ์">
          <option value="">ทุกสิทธิ์</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary shrink-0">
          ค้นหา
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">ผู้ใช้</th>
              <th className="px-4 py-3 font-medium">หน่วยงาน / โทร</th>
              <th className="px-4 py-3 font-medium">งาน</th>
              <th className="px-4 py-3 font-medium">สิทธิ์การใช้งาน</th>
              <th className="px-4 py-3 font-medium">สถานะบัญชี</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <UserRow
                key={u.id}
                isSelf={u.id === admin.id}
                user={{
                  id: u.id,
                  name: u.name,
                  email: u.email,
                  phone: u.phone,
                  department: u.department,
                  role: u.role,
                  isActive: u.isActive,
                  reported: u._count.reportedRequests,
                  openJobs: u._count.assignedRequests,
                }}
              />
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="px-4 py-10 text-center text-slate-500">ไม่พบผู้ใช้</p>}
      </div>
    </>
  );
}
