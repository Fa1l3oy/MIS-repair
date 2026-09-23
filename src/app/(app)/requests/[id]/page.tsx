import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityTimeline } from "@/components/activity-timeline";
import { PriorityBadge, StatusBadge } from "@/components/badges";
import { PhotoGallery } from "@/components/photo-gallery";
import { StatusStepper } from "@/components/status-stepper";
import { formatDateTime } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { canViewRequest, isStaff } from "@/lib/requests";
import { requireUser, STAFF_ROLES } from "@/lib/session";
import { CANCELLABLE_STATUSES } from "@/lib/workflow";
import { CommentForm } from "./comment-form";
import { CancelRequestButton, RatingForm } from "./reporter-actions";
import { StaffPanel } from "./staff-panel";

export const metadata: Metadata = { title: "รายละเอียดใบแจ้งซ่อม" };

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{children}</dd>
    </div>
  );
}

export default async function RequestDetailPage({ params, searchParams }: PageProps<"/requests/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const { created } = await searchParams;

  const request = await prisma.repairRequest.findUnique({
    where: { id },
    include: {
      building: { select: { name: true } },
      category: { select: { name: true } },
      reporter: { select: { id: true, name: true, email: true, phone: true, department: true } },
      assignee: { select: { id: true, name: true, phone: true } },
      images: { orderBy: { createdAt: "asc" }, select: { id: true, filename: true, kind: true } },
      activities: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { name: true, role: true } } },
      },
    },
  });
  if (!request || !canViewRequest(user, request)) notFound();

  const technicians =
    user.role === "ADMIN"
      ? await prisma.user.findMany({
          where: { isActive: true, role: { in: STAFF_ROLES } },
          orderBy: [{ role: "asc" }, { name: "asc" }], // technicians first, then admins
          select: { id: true, name: true },
        })
      : [];

  const isReporter = request.reporterId === user.id;
  const beforeImages = request.images.filter((i) => i.kind === "BEFORE");
  const afterImages = request.images.filter((i) => i.kind === "AFTER");
  const backHref = isStaff(user) && !isReporter ? "/maintenance" : "/requests";

  return (
    <div className="space-y-6">
      <div>
        <Link href={backHref} className="text-sm text-slate-500 hover:text-slate-800">
          ← กลับไปยังรายการ
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-slate-500">{request.code}</span>
          <StatusBadge status={request.status} />
          <PriorityBadge priority={request.priority} />
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{request.equipment}</h1>
      </div>

      {created && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
          ✅ ส่งแจ้งซ่อมเรียบร้อยแล้ว ช่างซ่อมบำรุงได้รับเรื่องแล้ว คุณสามารถติดตามสถานะได้จากหน้านี้
        </p>
      )}

      <section className="card p-5 sm:p-6">
        <StatusStepper status={request.status} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5 sm:p-6">
            <h2 className="mb-3 font-semibold">รายละเอียดปัญหา</h2>
            <p className="text-sm whitespace-pre-line text-slate-700">{request.description}</p>
            <h3 className="mt-5 mb-2 text-sm font-semibold text-slate-600">รูปภาพจากผู้แจ้ง</h3>
            <PhotoGallery images={beforeImages} emptyText="ไม่มีรูปภาพ" />
            {afterImages.length > 0 && (
              <>
                <h3 className="mt-5 mb-2 text-sm font-semibold text-emerald-700">รูปภาพหลังซ่อม</h3>
                <PhotoGallery images={afterImages} />
              </>
            )}
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-5 font-semibold">ประวัติการดำเนินงาน</h2>
            <ActivityTimeline activities={request.activities} />
            <CommentForm requestId={request.id} />
          </section>
        </div>

        <aside className="space-y-6">
          {isStaff(user) && (
            <StaffPanel
              requestId={request.id}
              status={request.status}
              assignee={request.assignee && { id: request.assignee.id, name: request.assignee.name }}
              viewer={{ id: user.id, role: user.role }}
              technicians={technicians}
            />
          )}

          <section className="card p-5">
            <h2 className="mb-2 font-semibold">ข้อมูลการแจ้งซ่อม</h2>
            <dl className="divide-y divide-slate-100">
              <InfoRow label="ประเภทงาน">{request.category.name}</InfoRow>
              {request.assetNumber && <InfoRow label="เลขครุภัณฑ์">{request.assetNumber}</InfoRow>}
              <InfoRow label="อาคาร">{request.building.name}</InfoRow>
              {request.floor && <InfoRow label="ชั้น">{request.floor}</InfoRow>}
              <InfoRow label="ห้อง/สถานที่">{request.location}</InfoRow>
              <InfoRow label="วันที่แจ้ง">{formatDateTime(request.createdAt)}</InfoRow>
              {request.completedAt && <InfoRow label="วันที่ซ่อมเสร็จ">{formatDateTime(request.completedAt)}</InfoRow>}
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="mb-2 font-semibold">ผู้เกี่ยวข้อง</h2>
            <dl className="divide-y divide-slate-100">
              <InfoRow label="ผู้แจ้ง">
                {request.reporter.name}
                {request.reporter.department && (
                  <span className="block text-xs font-normal text-slate-500">{request.reporter.department}</span>
                )}
              </InfoRow>
              {isStaff(user) && (
                <InfoRow label="ติดต่อผู้แจ้ง">
                  <span className="block">{request.reporter.email}</span>
                  {request.reporter.phone && (
                    <a href={`tel:${request.reporter.phone}`} className="block text-indigo-600">
                      {request.reporter.phone}
                    </a>
                  )}
                </InfoRow>
              )}
              <InfoRow label="ช่างผู้รับผิดชอบ">
                {request.assignee ? (
                  <>
                    {request.assignee.name}
                    {request.assignee.phone && (
                      <a href={`tel:${request.assignee.phone}`} className="block text-xs text-indigo-600">
                        {request.assignee.phone}
                      </a>
                    )}
                  </>
                ) : (
                  <span className="text-slate-400">ยังไม่มีผู้รับงาน</span>
                )}
              </InfoRow>
            </dl>
          </section>

          {isReporter && CANCELLABLE_STATUSES.includes(request.status) && (
            <section className="card p-5">
              <CancelRequestButton requestId={request.id} />
            </section>
          )}

          {isReporter && request.status === "COMPLETED" && (
            <section className="card p-5">
              <h2 className="mb-2 font-semibold">ความพึงพอใจ</h2>
              {request.rating ? (
                <div>
                  <p className="text-2xl text-amber-400">
                    {"★".repeat(request.rating)}
                    <span className="text-slate-300">{"★".repeat(5 - request.rating)}</span>
                  </p>
                  {request.feedback && <p className="mt-1 text-sm text-slate-600">{request.feedback}</p>}
                </div>
              ) : (
                <RatingForm requestId={request.id} />
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
