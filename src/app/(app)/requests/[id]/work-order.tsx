import { activityTitle } from "@/components/activity-timeline";
import type { ActivityType, Priority, RequestStatus } from "@/generated/prisma/enums";
import { formatDateTime, PRIORITY_LABEL, STATUS_LABEL } from "@/lib/labels";
import { floorText, formatPhone } from "@/lib/limits";
import type { SlaInfo } from "@/lib/sla";

type WorkOrderRequest = {
  code: string;
  equipment: string;
  assetNumber: string | null;
  description: string;
  floor: number | null;
  location: string;
  priority: Priority;
  status: RequestStatus;
  createdAt: Date;
  completedAt: Date | null;
  building: { name: string };
  category: { name: string };
  reporter: { name: string; phone: string | null; department: string | null };
  assignee: { name: string; phone: string | null } | null;
  images: { id: string; filename: string; kind: "BEFORE" | "AFTER" }[];
  activities: {
    id: string;
    type: ActivityType;
    toStatus: RequestStatus | null;
    message: string | null;
    createdAt: Date;
    actor: { name: string };
  }[];
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 border-b border-zinc-300 px-3 py-1.5">
      <dt className="w-28 shrink-0 text-zinc-500">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium break-words">{children || "-"}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 break-inside-avoid">
      <h2 className="mb-1.5 text-[13px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Signature({ role, name }: { role: string; name?: string }) {
  return (
    <div className="text-center">
      <p className="text-zinc-500">{role}</p>
      <p className="mt-9">ลงชื่อ ........................................</p>
      <p className="mt-1.5">( {name ?? "........................................"} )</p>
      <p className="mt-1.5">วันที่ ........ / ........ / ........</p>
    </div>
  );
}

/**
 * Paper work order: hidden on screen, it replaces the page when printed.
 * Blank lines and signature boxes are for the technician to fill in on site.
 */
export function WorkOrder({
  request,
  sla,
  qr,
  printedBy,
}: {
  request: WorkOrderRequest;
  sla: SlaInfo;
  qr: string;
  printedBy: string;
}) {
  const place = [request.building.name, floorText(request.floor), request.location].filter(Boolean).join(" · ");
  const photos = request.images.filter((i) => i.kind === "BEFORE").slice(0, 3);
  const trail = request.activities.filter((a) => a.type === "CREATED" || a.type === "STATUS_CHANGED" || a.type === "ASSIGNED");
  const repairNote = request.activities.findLast((a) => a.toStatus === "COMPLETED")?.message;

  return (
    <article className="hidden text-[12px] leading-relaxed text-zinc-900 print:block">
      <header className="flex items-start justify-between gap-6 border-b-2 border-zinc-900 pb-3">
        <div>
          <p className="text-[11px] tracking-wide text-zinc-500">Repair MIS · ระบบแจ้งซ่อม</p>
          <h1 className="mt-0.5 text-xl font-bold">ใบงานซ่อม</h1>
          <p className="mt-1 font-mono text-[15px] font-semibold">{request.code}</p>
        </div>
        <div className="flex items-center gap-3 text-right">
          <p className="max-w-40 text-[10px] text-zinc-500">สแกนเพื่อเปิดใบงานนี้ในระบบ และอัปเดตสถานะหน้างาน</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URI */}
          <img src={qr} alt="QR Code ของใบงาน" className="size-22" />
        </div>
      </header>

      <Section title="ข้อมูลการแจ้งซ่อม">
        <dl className="grid grid-cols-2 border-t border-l border-zinc-300 [&>div]:border-r">
          <Field label="วันที่แจ้ง">{formatDateTime(request.createdAt)}</Field>
          <Field label="สถานะ">{STATUS_LABEL[request.status]}</Field>
          <Field label="ความเร่งด่วน">{PRIORITY_LABEL[request.priority]}</Field>
          <Field label="กำหนดเสร็จ">{sla.state === "none" ? "-" : formatDateTime(sla.dueAt)}</Field>
          <Field label="ประเภทงาน">{request.category.name}</Field>
          <Field label="เลขครุภัณฑ์">{request.assetNumber}</Field>
          <Field label="อุปกรณ์">{request.equipment}</Field>
          <Field label="สถานที่">{place}</Field>
          <Field label="ผู้แจ้ง">
            {request.reporter.name}
            {request.reporter.department && ` (${request.reporter.department})`}
          </Field>
          <Field label="โทรผู้แจ้ง">{request.reporter.phone && formatPhone(request.reporter.phone)}</Field>
          <Field label="ช่างผู้รับผิดชอบ">{request.assignee?.name}</Field>
          <Field label="ซ่อมเสร็จเมื่อ">{request.completedAt && formatDateTime(request.completedAt)}</Field>
        </dl>
      </Section>

      <Section title="รายละเอียดปัญหา">
        <p className="rounded border border-zinc-300 px-3 py-2 whitespace-pre-line">{request.description}</p>
        {photos.length > 0 && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- auth-protected upload route
              <img
                key={p.id}
                src={`/api/uploads/${p.filename}`}
                alt={`รูปประกอบที่ ${i + 1}`}
                className="aspect-[4/3] w-full rounded border border-zinc-300 object-cover"
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="บันทึกการซ่อม (สาเหตุ / วิธีแก้ไข)">
        {repairNote ? (
          <p className="rounded border border-zinc-300 px-3 py-2 whitespace-pre-line">{repairNote}</p>
        ) : (
          <div className="space-y-5 pt-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="border-b border-dotted border-zinc-400" />
            ))}
          </div>
        )}
      </Section>

      <Section title="วัสดุ / อะไหล่ที่ใช้">
        <table className="w-full border-collapse [&_td]:border [&_td]:border-zinc-300 [&_td]:px-2 [&_td]:py-1.5 [&_th]:border [&_th]:border-zinc-300 [&_th]:px-2 [&_th]:py-1 [&_th]:font-medium">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="w-10 text-center">#</th>
              <th>รายการ</th>
              <th className="w-20 text-center">จำนวน</th>
              <th className="w-44">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((n) => (
              <tr key={n}>
                <td className="text-center text-zinc-400">{n}</td>
                <td>&nbsp;</td>
                <td />
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {trail.length > 1 && (
        <Section title="ประวัติการดำเนินงาน">
          <ul className="space-y-0.5">
            {trail.map((a) => (
              <li key={a.id} className="flex gap-3">
                <span className="w-36 shrink-0 text-zinc-500">{formatDateTime(a.createdAt)}</span>
                <span>
                  {activityTitle(a)} — {a.actor.name}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <section className="mt-8 grid grid-cols-3 gap-6 break-inside-avoid">
        <Signature role="ผู้แจ้งซ่อม" name={request.reporter.name} />
        <Signature role="ช่างผู้ซ่อม" name={request.assignee?.name} />
        <Signature role="ผู้ตรวจรับงาน" />
      </section>

      <footer className="mt-8 flex justify-between border-t border-zinc-300 pt-2 text-[10px] text-zinc-500">
        <span>พิมพ์โดย {printedBy}</span>
        <span>พิมพ์เมื่อ {formatDateTime(new Date())}</span>
      </footer>
    </article>
  );
}
