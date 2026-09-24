import {
  ClipboardList,
  LayoutDashboard,
  QrCode,
  Settings,
  UserRound,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/generated/prisma/enums";

export type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };
export type NavSection = { title: string; items: NavItem[] };

const MY_REQUESTS: NavItem = { href: "/requests", label: "รายการแจ้งซ่อมของฉัน", icon: ClipboardList };
const QUEUE: NavItem = { href: "/maintenance", label: "คิวงานซ่อม", icon: Wrench };
const DASHBOARD: NavItem = { href: "/admin", label: "แดชบอร์ด", icon: LayoutDashboard, exact: true };
export const PROFILE: NavItem = { href: "/profile", label: "โปรไฟล์", icon: UserRound };

export function navSections(role: Role): NavSection[] {
  const sections: NavSection[] = [{ title: "การแจ้งซ่อม", items: [MY_REQUESTS] }];
  if (role === "MAINTENANCE" || role === "ADMIN") sections.push({ title: "งานซ่อมบำรุง", items: [QUEUE] });
  if (role === "ADMIN") {
    sections.push({
      title: "ผู้ดูแลระบบ",
      items: [
        DASHBOARD,
        { href: "/admin/users", label: "จัดการผู้ใช้", icon: Users },
        { href: "/admin/qr-codes", label: "QR Code จุดแจ้งซ่อม", icon: QrCode },
        { href: "/admin/settings", label: "ตั้งค่าข้อมูล", icon: Settings },
      ],
    });
  }
  return sections;
}

/** The two role-specific shortcuts shown in the mobile tab bar. */
export function mobileTabs(role: Role): [NavItem, NavItem] {
  if (role === "ADMIN") return [DASHBOARD, { ...QUEUE, label: "คิวงาน" }];
  if (role === "MAINTENANCE") return [{ ...QUEUE, label: "คิวงาน" }, { ...MY_REQUESTS, label: "รายการ" }];
  return [{ ...MY_REQUESTS, label: "รายการ" }, PROFILE];
}

/** The single most specific item matching the path, so /admin/users doesn't also light up /admin. */
export function activeHref(pathname: string, items: NavItem[]) {
  // The new-request form has its own call-to-action button rather than a nav item.
  if (pathname === "/requests/new") return undefined;
  return items
    .filter((i) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(`${i.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}
