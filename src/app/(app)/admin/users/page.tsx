import { Search, ShieldCheck, UserRound, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
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

  const ROLE_ICON = { USER: UserRound, MAINTENANCE: Wrench, ADMIN: ShieldCheck } as const;

  return (
    <>
      <PageHeader
        title="จัดการผู้ใช้"
        description="กำหนดหรือเปลี่ยนสิทธิ์การใช้งาน ระงับบัญชี และเพิ่มผู้ใช้ใหม่"
        actions={<CreateUserForm />}
      />

      <div className="mb-6 grid grid-cols-3 gap-3 lg:gap-4">
        {ROLES.map((r) => {
          const Icon = ROLE_ICON[r];
          const selected = role === r;
          return (
            <Link
              key={r}
              href={selected ? "/admin/users" : `/admin/users?role=${r}`}
              aria-pressed={selected}
              className={`card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lift ${
                selected ? "border-zinc-900 ring-1 ring-zinc-900" : ""
              }`}
            >
              <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 sm:flex">
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs text-zinc-500 sm:text-sm">{ROLE_LABEL[r]}</span>
                <span className="block text-xl font-semibold tracking-tight text-zinc-900 tabular-nums sm:text-2xl">
                  {countFor(r)}
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      <form className="card mb-5 flex flex-col gap-3 p-3 sm:flex-row" action="/admin/users">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            name="q"
            defaultValue={q}
            className="input pl-10"
            placeholder="ค้นหาชื่อ อีเมล หรือหน่วยงาน"
            aria-label="ค้นหาผู้ใช้"
          />
        </div>
        <select name="role" defaultValue={role ?? ""} className="input sm:w-52" aria-label="สิทธิ์">
          <option value="">ทุกสิทธิ์</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary h-auto min-h-10 shrink-0">
          <Search className="size-4" />
          ค้นหา
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50/70 text-xs text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">ผู้ใช้</th>
              <th className="px-4 py-3 font-medium">หน่วยงาน / โทร</th>
              <th className="px-4 py-3 font-medium">งาน</th>
              <th className="px-4 py-3 font-medium">สิทธิ์การใช้งาน</th>
              <th className="px-4 py-3 font-medium">บัญชี</th>
              <th className="px-5 py-3 font-medium">
                <span className="sr-only">การจัดการ</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
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
        {users.length === 0 && <p className="px-5 py-12 text-center text-sm text-zinc-500">ไม่พบผู้ใช้ที่ตรงกับการค้นหา</p>}
      </div>
    </>
  );
}
