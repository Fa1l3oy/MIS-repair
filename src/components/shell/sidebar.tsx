"use client";

import { Bell, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { ROLE_LABEL } from "@/lib/labels";
import { InstallAppButton } from "../pwa/install-prompt";
import { SignOutButton } from "../sign-out-button";
import { Avatar } from "../ui/avatar";
import { BrandMark, BrandName } from "./brand-mark";
import { activeHref, navSections, PROFILE, type NavItem } from "./nav";
import { NotificationCountBadge } from "./notification-count";
import { SearchTrigger } from "./search-trigger";

export type ShellUser = { name: string; email: string; role: Role };

const NOTIFICATIONS: NavItem = { href: "/notifications", label: "การแจ้งเตือน", icon: Bell };

function SideLink({ item, active, trailing }: { item: NavItem; active: boolean; trailing?: React.ReactNode }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active ? "bg-zinc-100 text-zinc-900" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
      }`}
    >
      <Icon
        className={`size-[18px] shrink-0 ${active ? "text-brand-600" : "text-zinc-400 group-hover:text-zinc-600"}`}
        strokeWidth={1.75}
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {trailing}
    </Link>
  );
}

export function Sidebar({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const sections = navSections(user.role);
  const active = activeHref(pathname, [...sections.flatMap((s) => s.items), NOTIFICATIONS, PROFILE]);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-zinc-200/80 bg-white lg:flex print:hidden">
      <Link href="/" className="flex h-16 items-center gap-3 px-5">
        <BrandMark />
        <BrandName />
      </Link>

      <div className="space-y-2 px-3 pt-2 pb-4">
        <SearchTrigger variant="box" />
        <Link href="/requests/new" className="btn-primary w-full">
          <Plus className="size-4" strokeWidth={2.25} />
          แจ้งซ่อมใหม่
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4" aria-label="เมนูหลัก">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 pb-1.5 text-xs font-medium text-zinc-400">{section.title}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <SideLink item={item} active={active === item.href} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-zinc-100 p-3">
        <InstallAppButton />
        <SideLink item={NOTIFICATIONS} active={active === NOTIFICATIONS.href} trailing={<NotificationCountBadge />} />
        <div className="flex items-center gap-1 rounded-xl p-1.5 transition hover:bg-zinc-50">
          <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-0.5" title="โปรไฟล์ของฉัน">
            <Avatar name={user.name} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-medium text-zinc-900">{user.name}</span>
              <span className="block truncate text-xs text-zinc-500">{ROLE_LABEL[user.role]}</span>
            </span>
          </Link>
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
