import { Bell, BellOff, CheckCheck, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { PushToggle } from "@/components/pwa/push-toggle";
import { EmptyState } from "@/components/ui/empty-state";
import { timeAgo } from "@/lib/dates";
import { formatDateTime } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { markAllNotificationsRead, openNotification } from "./actions";

export const metadata: Metadata = { title: "การแจ้งเตือน" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="การแจ้งเตือน"
        description={unread > 0 ? `ยังไม่ได้อ่าน ${unread} รายการ` : "คุณอ่านครบทุกรายการแล้ว"}
        actions={
          unread > 0 && (
            <form action={markAllNotificationsRead}>
              <button type="submit" className="btn-secondary">
                <CheckCheck className="size-4" />
                อ่านทั้งหมด
              </button>
            </form>
          )
        }
      />

      <PushToggle />

      {notifications.length === 0 ? (
        <EmptyState icon={BellOff} title="ยังไม่มีการแจ้งเตือน" description="เมื่อมีความเคลื่อนไหวของงานซ่อม จะแจ้งให้ทราบที่นี่" />
      ) : (
        <ul className="card divide-y divide-zinc-100 overflow-hidden">
          {notifications.map((n) => (
            <li key={n.id}>
              <form action={openNotification.bind(null, n.id)}>
                <button
                  type="submit"
                  className={`group flex w-full items-start gap-3.5 px-4 py-4 text-left transition hover:bg-zinc-50 sm:px-5 ${
                    n.isRead ? "" : "bg-brand-50/40"
                  }`}
                >
                  <span
                    className={`relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${
                      n.isRead ? "bg-zinc-100 text-zinc-400" : "bg-brand-100 text-brand-600"
                    }`}
                  >
                    <Bell className="size-4" strokeWidth={2} />
                    {!n.isRead && (
                      <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-brand-600 ring-2 ring-white" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${n.isRead ? "text-zinc-700" : "font-semibold text-zinc-900"}`}>
                      {n.title}
                    </span>
                    <span className="mt-0.5 block text-sm text-zinc-500">{n.message}</span>
                    <span className="mt-1 block text-xs text-zinc-400" title={formatDateTime(n.createdAt)}>
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                  <ChevronRight className="mt-2 size-4 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-zinc-500" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
