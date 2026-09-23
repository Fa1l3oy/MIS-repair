import "server-only";
import { requestRowSelect } from "@/components/request-table";
import { Prisma } from "@/generated/prisma/client";
import type { RequestStatus } from "@/generated/prisma/enums";
import { startOfTodayBangkok } from "@/lib/dates";
import { CLOSED_STATUSES } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const RANGES = [
  { key: "7", label: "7 วันล่าสุด", days: 7 },
  { key: "30", label: "30 วันล่าสุด", days: 30 },
  { key: "90", label: "90 วันล่าสุด", days: 90 },
  { key: "all", label: "ทั้งหมด", days: null },
] as const;
export type RangeKey = (typeof RANGES)[number]["key"];

type Bucket = "day" | "week" | "month";
export type TrendPoint = { key: string; label: string; fullLabel: string; value: number };

const DAY_MS = 86_400_000;

function bangkokDateKey(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(d); // YYYY-MM-DD
}

/**
 * Builds every bucket in the window (so empty days show as zero-height columns)
 * and fills in the counts that came back from the database.
 */
function buildTrend(
  bucket: Bucket,
  start: Date,
  countedFrom: Date,
  rows: { bucket: string; count: number }[],
): TrendPoint[] {
  const counts = new Map(rows.map((r) => [r.bucket, r.count]));
  const points: TrendPoint[] = [];
  const today = startOfTodayBangkok();

  if (bucket === "month") {
    const [y, m] = bangkokDateKey(today).split("-").map(Number);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(y, m - 1 - i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
      points.push({
        key,
        label: new Intl.DateTimeFormat("th-TH", { month: "short", timeZone: "UTC" }).format(d),
        fullLabel: new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric", timeZone: "UTC" }).format(d),
        value: counts.get(key) ?? 0,
      });
    }
    return points;
  }

  const step = bucket === "week" ? 7 : 1;
  const dayFmt = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
  const longFmt = new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "Asia/Bangkok" });
  for (let cursor = start; cursor <= today; cursor = new Date(cursor.getTime() + step * DAY_MS)) {
    const key = bangkokDateKey(cursor);
    // The first week can start before the selected range; say so, since only
    // requests inside the range are counted (so the columns sum to the KPI total).
    const partial = cursor < countedFrom ? ` (นับตั้งแต่ ${longFmt.format(countedFrom)})` : "";
    points.push({
      key,
      label: dayFmt.format(cursor),
      fullLabel: bucket === "week" ? `สัปดาห์ของ ${longFmt.format(cursor)}${partial}` : longFmt.format(cursor),
      value: counts.get(key) ?? 0,
    });
  }
  return points;
}

/**
 * Where the trend chart's first bucket begins: the range start for daily buckets,
 * the Monday on/before it for weekly ones (aligned with Postgres
 * date_trunc('week')), and 12 months back for the all-time view.
 */
function trendStart(bucket: Bucket, from: Date | null): Date {
  if (bucket === "month" || !from) {
    const [y, m] = bangkokDateKey(startOfTodayBangkok()).split("-").map(Number);
    return new Date(`${new Date(Date.UTC(y, m - 12, 1)).toISOString().slice(0, 10)}T00:00:00+07:00`);
  }
  if (bucket === "week") {
    const weekday = (new Date(`${bangkokDateKey(from)}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
    return new Date(from.getTime() - weekday * DAY_MS);
  }
  return from;
}

/**
 * `AND r."createdAt" >= from` for raw queries. Prisma stores DateTime as UTC in
 * `timestamp without time zone` columns while the server runs in Asia/Bangkok,
 * so the bound is converted to a UTC timestamp explicitly.
 */
function sinceSql(from: Date | null) {
  return from ? Prisma.sql`AND r."createdAt" >= (${from.toISOString()}::timestamptz AT TIME ZONE 'UTC')` : Prisma.empty;
}

export async function getDashboardData(rangeKey: RangeKey) {
  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[1];
  const from = range.days ? new Date(startOfTodayBangkok().getTime() - (range.days - 1) * DAY_MS) : null;
  const where: Prisma.RepairRequestWhereInput = from ? { createdAt: { gte: from } } : {};

  const bucket: Bucket = range.days === null ? "month" : range.days > 30 ? "week" : "day";
  const trendFrom = trendStart(bucket, from);
  // Count only inside the selected range; the all-time view charts the last 12 months.
  const trendCountedFrom = bucket === "month" || !from ? trendFrom : from;

  const [total, byStatus, byBuilding, byCategory, ratingAgg, repairTime, trendRows, techRows, recent, buildings, categories] =
    await Promise.all([
      prisma.repairRequest.count({ where }),
      prisma.repairRequest.groupBy({ by: ["status"], where, _count: { _all: true } }),
      prisma.repairRequest.groupBy({ by: ["buildingId"], where, _count: { _all: true } }),
      prisma.repairRequest.groupBy({ by: ["categoryId"], where, _count: { _all: true } }),
      prisma.repairRequest.aggregate({ where: { ...where, rating: { not: null } }, _avg: { rating: true }, _count: { rating: true } }),
      prisma.$queryRaw<{ avg_hours: number | null }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM (r."completedAt" - r."createdAt")) / 3600)::float AS avg_hours
        FROM "RepairRequest" r
        WHERE r.status = 'COMPLETED' AND r."completedAt" IS NOT NULL ${sinceSql(from)}`,
      prisma.$queryRaw<{ bucket: string; count: number }[]>`
        SELECT to_char(date_trunc(${bucket}, (r."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'), 'YYYY-MM-DD') AS bucket,
               COUNT(*)::int AS count
        FROM "RepairRequest" r
        WHERE true ${sinceSql(trendCountedFrom)}
        GROUP BY 1`,
      prisma.$queryRaw<
        { id: string; name: string; assigned: number; completed: number; open: number; avg_rating: number | null; avg_hours: number | null }[]
      >`
        SELECT u.id, u.name,
               COUNT(r.id)::int AS assigned,
               COUNT(r.id) FILTER (WHERE r.status = 'COMPLETED')::int AS completed,
               COUNT(r.id) FILTER (WHERE r.status IN ('ACCEPTED', 'IN_PROGRESS', 'ON_HOLD'))::int AS open,
               AVG(r.rating)::float AS avg_rating,
               (AVG(EXTRACT(EPOCH FROM (r."completedAt" - r."createdAt"))) FILTER (WHERE r.status = 'COMPLETED') / 3600)::float AS avg_hours
        FROM "User" u
        LEFT JOIN "RepairRequest" r ON r."assigneeId" = u.id ${sinceSql(from)}
        WHERE u.role IN ('MAINTENANCE', 'ADMIN') AND u."isActive" = true
        GROUP BY u.id, u.name, u.role
        ORDER BY (u.role = 'ADMIN'), completed DESC, u.name`,
      prisma.repairRequest.findMany({ where, orderBy: { createdAt: "desc" }, take: 8, select: requestRowSelect }),
      prisma.building.findMany({ select: { id: true, name: true } }),
      prisma.category.findMany({ select: { id: true, name: true } }),
    ]);

  const statusCount = (s: RequestStatus) => byStatus.find((g) => g.status === s)?._count._all ?? 0;
  const open = byStatus.filter((g) => !CLOSED_STATUSES.includes(g.status)).reduce((n, g) => n + g._count._all, 0);
  const completed = statusCount("COMPLETED");
  const decided = completed + statusCount("REJECTED"); // cancelled requests never reached a technician's verdict

  const named = (rows: { id: string; name: string }[], groups: { key: string; count: number }[]) =>
    groups
      .map((g) => ({ label: rows.find((r) => r.id === g.key)?.name ?? "-", value: g.count }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "th"));

  return {
    range,
    kpis: {
      total,
      open,
      completed,
      completionRate: decided ? completed / decided : null,
      avgRepairHours: repairTime[0]?.avg_hours ?? null,
      avgRating: ratingAgg._avg.rating,
      ratingCount: ratingAgg._count.rating,
    },
    byStatus: statusCount,
    trend: { bucket, points: buildTrend(bucket, trendFrom, trendCountedFrom, trendRows) },
    byBuilding: named(
      buildings,
      byBuilding.map((g) => ({ key: g.buildingId, count: g._count._all })),
    ),
    byCategory: named(
      categories,
      byCategory.map((g) => ({ key: g.categoryId, count: g._count._all })),
    ),
    technicians: techRows,
    recent,
  };
}

/** Top N rows, with the tail folded into one "อื่นๆ" row. */
export function foldTail<T extends { label: string; value: number }>(rows: T[], keep = 6) {
  if (rows.length <= keep + 1) return rows;
  const tail = rows.slice(keep).reduce((n, r) => n + r.value, 0);
  return [...rows.slice(0, keep), { label: `อื่นๆ (${rows.length - keep} รายการ)`, value: tail }];
}

export function formatHours(hours: number | null) {
  if (hours === null || Number.isNaN(hours)) return "-";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} นาที`;
  if (hours < 48) return `${hours.toFixed(1)} ชม.`;
  return `${(hours / 24).toFixed(1)} วัน`;
}
