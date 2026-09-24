import {
  AlarmClock,
  ArrowLeft,
  Building2,
  CalendarClock,
  CircleCheck,
  Hash,
  Layers,
  Mail,
  MapPin,
  Phone,
  Tag,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityTimeline } from "@/components/activity-timeline";
import { PriorityBadge, StatusBadge } from "@/components/badges";
import { PhotoGallery } from "@/components/photo-gallery";
import { SlaBadge } from "@/components/sla-badge";
import { StatusStepper } from "@/components/status-stepper";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import type { RequestStatus } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { canViewRequest, isStaff } from "@/lib/requests";
import { requireUser, STAFF_ROLES } from "@/lib/session";
import { SLA_HOURS, slaInfo } from "@/lib/sla";
import { CANCELLABLE_STATUSES } from "@/lib/workflow";
import { CommentForm } from "./comment-form";
import { CancelRequestButton, RatingForm, RatingStars } from "./reporter-actions";
import { StaffPanel } from "./staff-panel";

export const metadata: Metadata = { title: "รายละเอียดใบแจ้งซ่อม" };

function InfoRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-zinc-400" strokeWidth={1.75} />
      <dt className="w-24 shrink-0 text-zinc-500">{label}</dt>
      <dd className="min-w-0 flex-1 text-right font-medium break-words text-zinc-900">{children}</dd>
    </div>
  );
}

function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-5 ${className}`}>
      {title && <h2 className="mb-3 text-sm font-semibold text-zinc-900">{title}</h2>}
      {children}
    </section>
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

  // When each progress step was reached (first time), for the stepper.
  const reachedAt: Partial<Record<RequestStatus, Date>> = { PENDING: request.createdAt };
  for (const a of request.activities) {
    if (a.toStatus && a.type !== "CREATED" && !reachedAt[a.toStatus]) reachedAt[a.toStatus] = a.createdAt;
  }
  const sla = slaInfo(request);
  const hasActions = isStaff(user) || (isReporter && request.status === "COMPLETED");
  const closingNote =
    request.status === "REJECTED" || request.status === "CANCELLED"
      ? request.activities.findLast((a) => a.toStatus === request.status)?.message
      : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
        >
          <ArrowLeft className="size-4" />
          กลับไปยังรายการ
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="chip">{request.code}</span>
          <StatusBadge status={request.status} />
          <PriorityBadge priority={request.priority} withLabel />
          <SlaBadge sla={sla} />
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[28px]">{request.equipment}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 text-zinc-400" strokeWidth={1.75} />
            {request.building.name}
            {request.floor && ` · ชั้น ${request.floor}`} · {request.location}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-4 text-zinc-400" strokeWidth={1.75} />
            แจ้งเมื่อ {formatDateTime(request.createdAt)}
          </span>
        </p>
      </div>

      {created && (
        <Alert tone="success" title="ส่งแจ้งซ่อมเรียบร้อยแล้ว">
          ช่างซ่อมบำรุงได้รับเรื่องแล้ว คุณติดตามสถานะได้จากหน้านี้ และจะได้รับการแจ้งเตือนเมื่อมีความคืบหน้า
        </Alert>
      )}

      <section className="card px-4 py-6 sm:px-8">
        <StatusStepper status={request.status} reachedAt={reachedAt} closingNote={closingNote} />
      </section>

      {/* Mobile order: actions → details → info. Desktop: details on the left; actions then info on the right. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr]">
        {hasActions && (
          <div className="space-y-6 lg:col-start-2 lg:row-start-1">
            {isStaff(user) && (
              <StaffPanel
                requestId={request.id}
                status={request.status}
                assignee={request.assignee && { id: request.assignee.id, name: request.assignee.name }}
                viewer={{ id: user.id, role: user.role }}
                technicians={technicians}
              />
            )}
            {isReporter && request.status === "COMPLETED" && (
              <Panel title="ความพึงพอใจ">
                {request.rating ? (
                  <div>
                    <RatingStars value={request.rating} className="size-6" />
                    {request.feedback && <p className="mt-2 text-sm text-zinc-600">“{request.feedback}”</p>}
                  </div>
                ) : (
                  <RatingForm requestId={request.id} />
                )}
              </Panel>
            )}
          </div>
        )}

        <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <Panel>
            <h2 className="text-sm font-semibold text-zinc-900">รายละเอียดปัญหา</h2>
            <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line text-zinc-700">{request.description}</p>

            <h3 className="mt-6 mb-3 text-xs font-medium text-zinc-500">รูปภาพจากผู้แจ้ง</h3>
            <PhotoGallery images={beforeImages} emptyText="ไม่มีรูปภาพ" />

            {afterImages.length > 0 && (
              <>
                <h3 className="mt-6 mb-3 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <CircleCheck className="size-3.5" strokeWidth={2} />
                  รูปภาพหลังซ่อม
                </h3>
                <PhotoGallery images={afterImages} />
              </>
            )}
          </Panel>

          <Panel>
            <h2 className="mb-5 text-sm font-semibold text-zinc-900">ประวัติการดำเนินงาน</h2>
            <ActivityTimeline activities={request.activities} />
            <CommentForm requestId={request.id} />
          </Panel>
        </div>

        <aside className={`space-y-6 lg:col-start-2 ${hasActions ? "lg:row-start-2" : "lg:row-span-2 lg:row-start-1"}`}>
          <Panel title="ข้อมูลการแจ้งซ่อม">
            <dl className="divide-y divide-zinc-100">
              <InfoRow icon={Hash} label="เลขที่">
                <span className="font-mono text-[13px]">{request.code}</span>
              </InfoRow>
              <InfoRow icon={Tag} label="ประเภทงาน">
                {request.category.name}
              </InfoRow>
              {request.assetNumber && (
                <InfoRow icon={Layers} label="เลขครุภัณฑ์">
                  {request.assetNumber}
                </InfoRow>
              )}
              <InfoRow icon={Building2} label="อาคาร">
                {request.building.name}
              </InfoRow>
              <InfoRow icon={MapPin} label="ห้อง/สถานที่">
                {request.floor && `ชั้น ${request.floor} · `}
                {request.location}
              </InfoRow>
              <InfoRow icon={CalendarClock} label="วันที่แจ้ง">
                {formatDateTime(request.createdAt)}
              </InfoRow>
              {sla.state !== "none" && (
                <InfoRow icon={AlarmClock} label="กำหนดเสร็จ">
                  {formatDateTime(sla.dueAt)}
                  <span className="block text-xs font-normal text-zinc-400">
                    ภายใน {SLA_HOURS[request.priority] >= 48 ? `${SLA_HOURS[request.priority] / 24} วัน` : `${SLA_HOURS[request.priority]} ชม.`} ตามความเร่งด่วน
                  </span>
                </InfoRow>
              )}
              {request.completedAt && (
                <InfoRow icon={CircleCheck} label="ซ่อมเสร็จ">
                  {formatDateTime(request.completedAt)}
                </InfoRow>
              )}
            </dl>
          </Panel>

          <Panel title="ผู้เกี่ยวข้อง">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Avatar name={request.reporter.name} />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="text-xs text-zinc-500">ผู้แจ้ง</p>
                  <p className="truncate font-medium text-zinc-900">{request.reporter.name}</p>
                  {request.reporter.department && (
                    <p className="truncate text-xs text-zinc-500">{request.reporter.department}</p>
                  )}
                  {isStaff(user) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a
                        href={`mailto:${request.reporter.email}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
                      >
                        <Mail className="size-3.5" />
                        อีเมล
                      </a>
                      {request.reporter.phone && (
                        <a
                          href={`tel:${request.reporter.phone}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
                        >
                          <Phone className="size-3.5" />
                          {request.reporter.phone}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3 border-t border-zinc-100 pt-4">
                {request.assignee ? (
                  <Avatar name={request.assignee.name} />
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-300 text-zinc-300">
                    ?
                  </span>
                )}
                <div className="min-w-0 flex-1 text-sm">
                  <p className="text-xs text-zinc-500">ช่างผู้รับผิดชอบ</p>
                  {request.assignee ? (
                    <>
                      <p className="truncate font-medium text-zinc-900">{request.assignee.name}</p>
                      {request.assignee.phone && (
                        <a
                          href={`tel:${request.assignee.phone}`}
                          className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
                        >
                          <Phone className="size-3.5" />
                          {request.assignee.phone}
                        </a>
                      )}
                    </>
                  ) : (
                    <p className="text-zinc-400">ยังไม่มีผู้รับงาน</p>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          {isReporter && CANCELLABLE_STATUSES.includes(request.status) && (
            <Panel>
              <CancelRequestButton requestId={request.id} />
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}
