import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
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
        description={unread > 0 ? `ยังไม่ได้อ่าน ${unread} รายการ` : "อ่านครบทุกรายการแล้ว"}
        actions={
          unread > 0 && (
            <form action={markAllNotificationsRead}>
              <button type="submit" className="btn-secondary">
                ✓ ทำเครื่องหมายว่าอ่านทั้งหมด
              </button>
            </form>
          )
        }
      />

      {notifications.length === 0 ? (
        <div className="card px-6 py-16 text-center text-slate-500">
          <p className="mb-2 text-4xl">🔕</p>
          ยังไม่มีการแจ้งเตือน
        </div>
      ) : (
        <ul className="card divide-y divide-slate-100 overflow-hidden">
          {notifications.map((n) => (
            <li key={n.id}>
              <form action={openNotification.bind(null, n.id)}>
                <button
                  type="submit"
                  className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${n.isRead ? "" : "bg-indigo-50/60"}`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? "bg-transparent" : "bg-indigo-600"}`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${n.isRead ? "text-slate-700" : "font-semibold text-slate-900"}`}>
                      {n.title}
                    </span>
                    <span className="block text-sm text-slate-500">{n.message}</span>
                    <span className="mt-0.5 block text-xs text-slate-400" title={formatDateTime(n.createdAt)}>
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
