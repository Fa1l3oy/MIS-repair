"use client";

import { Bell, Menu, Plus, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ROLE_LABEL } from "@/lib/labels";
import { SignOutButton } from "../sign-out-button";
import { Avatar } from "../ui/avatar";
import { BrandMark, BrandName } from "./brand-mark";
import { activeHref, mobileTabs, navSections, PROFILE, type NavItem } from "./nav";
import { NotificationCountBadge, useNotificationCount } from "./notification-count";
import type { ShellUser } from "./sidebar";

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-1 py-2 text-[11px] font-medium ${active ? "text-zinc-900" : "text-zinc-400"}`}
    >
      <Icon className={`size-[22px] ${active ? "text-brand-600" : ""}`} strokeWidth={active ? 2 : 1.75} />
      <span className="max-w-full truncate px-1">{item.label}</span>
    </Link>
  );
}

/** Top bar + bottom tab bar (with a raised "report" button) + full menu sheet, below the lg breakpoint. */
export function MobileNav({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const unread = useNotificationCount();
  const [menuOpen, setMenuOpen] = useState(false);
  const [left, right] = mobileTabs(user.role);
  const sections = navSections(user.role);
  const allItems = [...sections.flatMap((s) => s.items), PROFILE, left, right];
  const active = activeHref(pathname, [...allItems, { href: "/notifications", label: "", icon: Bell }]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200/70 bg-white/85 px-4 backdrop-blur-md lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark className="size-8" />
          <BrandName />
        </Link>
        <Link href="/profile" aria-label="โปรไฟล์ของฉัน">
          <Avatar name={user.name} size="sm" />
        </Link>
      </header>

      <nav
        aria-label="เมนูหลัก"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/70 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2">
          <TabLink item={left} active={active === left.href} />
          <TabLink item={right} active={active === right.href} />
          <div className="flex justify-center">
            <Link
              href="/requests/new"
              className="-mt-5 mb-1 flex flex-col items-center gap-1 text-[11px] font-medium text-zinc-900"
            >
              <span className="flex size-13 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lift ring-4 ring-white">
                <Plus className="size-6" strokeWidth={2.25} />
              </span>
              แจ้งซ่อม
            </Link>
          </div>
          <Link
            href="/notifications"
            aria-current={active === "/notifications" ? "page" : undefined}
            className={`relative flex flex-col items-center gap-1 py-2 text-[11px] font-medium ${
              active === "/notifications" ? "text-zinc-900" : "text-zinc-400"
            }`}
            aria-label={unread > 0 ? `การแจ้งเตือน ${unread} รายการที่ยังไม่อ่าน` : "การแจ้งเตือน"}
          >
            <Bell
              className={`size-[22px] ${active === "/notifications" ? "text-brand-600" : ""}`}
              strokeWidth={active === "/notifications" ? 2 : 1.75}
            />
            <NotificationCountBadge className="absolute top-1 left-1/2 ml-1 h-4 min-w-4 px-1 text-[10px] ring-2 ring-white" />
            แจ้งเตือน
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center gap-1 py-2 text-[11px] font-medium text-zinc-400"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
          >
            <Menu className="size-[22px]" strokeWidth={1.75} />
            เมนู
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="เมนู">
          <button
            type="button"
            aria-label="ปิดเมนู"
            onClick={close}
            className="animate-fade-in absolute inset-0 bg-zinc-900/30 backdrop-blur-[2px]"
          />
          <div className="animate-sheet-up absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lift">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-200" />
            <div className="mb-3 flex items-center gap-3 px-1">
              <Avatar name={user.name} />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-semibold text-zinc-900">{user.name}</p>
                <p className="truncate text-xs text-zinc-500">
                  {user.email} · {ROLE_LABEL[user.role]}
                </p>
              </div>
              <button type="button" onClick={close} className="btn-icon" aria-label="ปิดเมนู">
                <X className="size-5" />
              </button>
            </div>
            {[...sections, { title: "บัญชี", items: [PROFILE] }].map((section) => (
              <div key={section.title} className="border-t border-zinc-100 py-2">
                <p className="px-3 pt-1 pb-1 text-xs font-medium text-zinc-400">{section.title}</p>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = active === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                        isActive ? "bg-zinc-100 text-zinc-900" : "text-zinc-700 active:bg-zinc-50"
                      }`}
                    >
                      <Icon className={`size-[18px] ${isActive ? "text-brand-600" : "text-zinc-400"}`} strokeWidth={1.75} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
            <div className="border-t border-zinc-100 pt-2">
              <SignOutButton variant="row" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
