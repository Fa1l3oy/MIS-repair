import Link from "next/link";
import type { Session } from "next-auth";
import { ROLE_LABEL, ROLE_STYLE } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { NavLinks, type NavItem } from "./nav-links";
import { NotificationBell } from "./notification-bell";
import { SignOutButton } from "./sign-out-button";

function navFor(role: Session["user"]["role"]): NavItem[] {
  const items: NavItem[] = [
    { href: "/requests/new", label: "แจ้งซ่อม" },
    { href: "/requests", label: "รายการแจ้งซ่อมของฉัน" },
  ];
  if (role === "MAINTENANCE" || role === "ADMIN") items.push({ href: "/maintenance", label: "งานซ่อม" });
  if (role === "ADMIN") {
    items.push(
      { href: "/admin", label: "แดชบอร์ด", exact: true },
      { href: "/admin/users", label: "จัดการผู้ใช้" },
      { href: "/admin/settings", label: "ตั้งค่าข้อมูล" },
    );
  }
  return items;
}

export async function AppHeader({ user }: { user: Session["user"] }) {
  const items = navFor(user.role);
  const unread = await prisma.notification.count({ where: { userId: user.id, isRead: false } });
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg text-white">🛠️</span>
          <span className="hidden sm:inline">ระบบแจ้งซ่อม</span>
        </Link>
        <NavLinks items={items} className="hidden flex-1 items-center gap-1 lg:flex" />
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell initialCount={unread} />
          <div className="hidden text-right sm:block">
            <p className="text-sm leading-tight font-medium">{user.name}</p>
            <span className={`badge mt-0.5 ${ROLE_STYLE[user.role]}`}>{ROLE_LABEL[user.role]}</span>
          </div>
          <SignOutButton />
        </div>
      </div>
      <NavLinks items={items} className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden" />
    </header>
  );
}
