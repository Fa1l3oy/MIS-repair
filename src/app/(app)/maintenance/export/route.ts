import { csvDate, toCsv } from "@/lib/csv";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/labels";
import { floorLabel } from "@/lib/limits";
import { maintenanceOrderBy, maintenanceWhere, parseMaintenanceFilters } from "@/lib/maintenance-filters";
import { prisma } from "@/lib/prisma";
import { isStaff } from "@/lib/requests";
import { currentUser } from "@/lib/session";
import { slaInfo, type SlaState } from "@/lib/sla";

/** Upper bound so one click can't pull the whole table into memory. */
const MAX_ROWS = 10_000;

const SLA_TEXT: Record<SlaState, string> = {
  met: "ทันเวลา",
  missed: "ล่าช้ากว่ากำหนด",
  "on-track": "อยู่ในกำหนด",
  "due-soon": "ใกล้ครบกำหนด",
  overdue: "เกินกำหนด",
  none: "",
};

/** CSV of the maintenance queue with the same filters as the page (staff only). */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return new Response("กรุณาเข้าสู่ระบบ", { status: 401 });
  if (!isStaff(user)) return new Response("ไม่มีสิทธิ์ส่งออกข้อมูล", { status: 403 });

  const now = new Date();
  const filters = parseMaintenanceFilters(Object.fromEntries(new URL(req.url).searchParams));
  const rows = await prisma.repairRequest.findMany({
    where: maintenanceWhere(filters, user.id, now),
    orderBy: maintenanceOrderBy(filters.tab),
    take: MAX_ROWS,
    select: {
      code: true,
      createdAt: true,
      completedAt: true,
      status: true,
      priority: true,
      equipment: true,
      assetNumber: true,
      floor: true,
      location: true,
      description: true,
      rating: true,
      feedback: true,
      category: { select: { name: true } },
      building: { select: { name: true } },
      reporter: { select: { name: true, department: true } },
      assignee: { select: { name: true } },
    },
  });

  const csv = toCsv([
    [
      "เลขที่",
      "วันที่แจ้ง",
      "สถานะ",
      "ความเร่งด่วน",
      "ประเภทงาน",
      "อุปกรณ์",
      "เลขครุภัณฑ์",
      "อาคาร",
      "ชั้น",
      "ห้อง/สถานที่",
      "รายละเอียด",
      "ผู้แจ้ง",
      "หน่วยงาน",
      "ช่างผู้รับผิดชอบ",
      "กำหนดเสร็จ",
      "ซ่อมเสร็จเมื่อ",
      "SLA",
      "ใช้เวลาซ่อม (ชม.)",
      "คะแนนความพึงพอใจ",
      "ความคิดเห็น",
    ],
    ...rows.map((r) => {
      const sla = slaInfo(r, now);
      const hours = r.completedAt ? (r.completedAt.getTime() - r.createdAt.getTime()) / 3_600_000 : null;
      return [
        r.code,
        csvDate(r.createdAt),
        STATUS_LABEL[r.status],
        PRIORITY_LABEL[r.priority],
        r.category.name,
        r.equipment,
        r.assetNumber,
        r.building.name,
        r.floor === null ? null : floorLabel(r.floor),
        r.location,
        r.description,
        r.reporter.name,
        r.reporter.department,
        r.assignee?.name,
        sla.state === "none" ? "" : csvDate(sla.dueAt),
        csvDate(r.completedAt),
        SLA_TEXT[sla.state],
        hours === null ? null : Math.round(hours * 10) / 10,
        r.rating,
        r.feedback,
      ];
    }),
  ]);

  const stamp = csvDate(now).slice(0, 10).replaceAll("-", "");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="repair-requests-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
