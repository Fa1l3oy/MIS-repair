import type { Metadata } from "next";
import Link from "next/link";
import { BarList, ColumnChart, StatTile } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { RequestTable } from "@/components/request-table";
import { foldTail, formatHours, getDashboardData, RANGES, type RangeKey } from "@/lib/dashboard";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/labels";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "แดชบอร์ด" };

const nf = new Intl.NumberFormat("th-TH");

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function AdminDashboardPage({ searchParams }: PageProps<"/admin">) {
  await requireUser(["ADMIN"]);
  const { range: rangeParam } = await searchParams;
  const rangeKey = (RANGES.find((r) => r.key === rangeParam)?.key ?? "30") as RangeKey;
  const data = await getDashboardData(rangeKey);
  const { kpis } = data;

  const trendTitle =
    data.trend.bucket === "month"
      ? "จำนวนแจ้งซ่อมรายเดือน (12 เดือนล่าสุด)"
      : data.trend.bucket === "week"
        ? "จำนวนแจ้งซ่อมรายสัปดาห์"
        : "จำนวนแจ้งซ่อมรายวัน";

  return (
    <>
      <PageHeader title="แดชบอร์ด" description="ภาพรวมงานแจ้งซ่อมและประสิทธิภาพการซ่อมบำรุง" />

      {/* One filter row, scoping everything below it */}
      <nav className="mb-6 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 sm:inline-flex" aria-label="ช่วงเวลา">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={`/admin?range=${r.key}`}
            aria-current={r.key === rangeKey ? "true" : undefined}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              r.key === rangeKey ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {r.key === rangeKey && "✓ "}
            {r.label}
          </Link>
        ))}
      </nav>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="ใบแจ้งซ่อม" value={nf.format(kpis.total)} hint={data.range.label} />
        <StatTile label="ยังไม่ปิดงาน" value={nf.format(kpis.open)} hint="รอรับเรื่อง / กำลังซ่อม" />
        <StatTile
          label="ซ่อมเสร็จ"
          value={nf.format(kpis.completed)}
          hint={kpis.completionRate === null ? undefined : `${Math.round(kpis.completionRate * 100)}% ของงานที่ปิดแล้ว`}
        />
        <StatTile label="เวลาซ่อมเฉลี่ย" value={formatHours(kpis.avgRepairHours)} hint="ตั้งแต่แจ้งจนซ่อมเสร็จ" />
        <StatTile
          label="ความพึงพอใจเฉลี่ย"
          value={kpis.avgRating === null ? "-" : `${kpis.avgRating.toFixed(1)} / 5`}
          hint={`จากการประเมิน ${nf.format(kpis.ratingCount)} ครั้ง`}
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title={trendTitle} subtitle="วางเมาส์หรือกด Tab ที่แท่งเพื่อดูจำนวน">
            <ColumnChart points={data.trend.points} />
          </Card>
        </div>
        <Card title="แยกตามสถานะ">
          <BarList rows={STATUS_ORDER.map((s) => ({ label: STATUS_LABEL[s], value: data.byStatus(s) }))} />
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card title="อาคารที่แจ้งซ่อมมากที่สุด">
          <BarList rows={foldTail(data.byBuilding)} />
        </Card>
        <Card title="ประเภทงานซ่อม">
          <BarList rows={foldTail(data.byCategory)} />
        </Card>
      </div>

      <section className="card mb-6 overflow-x-auto">
        <div className="p-5 pb-3">
          <h2 className="font-semibold text-slate-900">ผลการปฏิบัติงานของช่าง</h2>
          <p className="text-xs text-slate-500">งานที่แจ้งเข้ามาใน{data.range.label === "ทั้งหมด" ? "ทุกช่วงเวลา" : data.range.label}</p>
        </div>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-5 py-2.5 font-medium">ช่าง</th>
              <th className="px-5 py-2.5 text-right font-medium">ได้รับงาน</th>
              <th className="px-5 py-2.5 text-right font-medium">ซ่อมเสร็จ</th>
              <th className="px-5 py-2.5 text-right font-medium">ค้างอยู่</th>
              <th className="px-5 py-2.5 text-right font-medium">เวลาซ่อมเฉลี่ย</th>
              <th className="px-5 py-2.5 text-right font-medium">คะแนนเฉลี่ย</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {data.technicians.map((t) => (
              <tr key={t.id}>
                <td className="px-5 py-2.5 font-medium text-slate-800">{t.name}</td>
                <td className="px-5 py-2.5 text-right">{nf.format(t.assigned)}</td>
                <td className="px-5 py-2.5 text-right">{nf.format(t.completed)}</td>
                <td className="px-5 py-2.5 text-right">{nf.format(t.open)}</td>
                <td className="px-5 py-2.5 text-right">{formatHours(t.avg_hours)}</td>
                <td className="px-5 py-2.5 text-right">{t.avg_rating === null ? "-" : `${t.avg_rating.toFixed(1)} ★`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.technicians.length === 0 && <p className="px-5 py-6 text-sm text-slate-500">ยังไม่มีช่างซ่อมบำรุงในระบบ</p>}
      </section>

      <div className="mb-3 flex items-end justify-between">
        <h2 className="font-semibold text-slate-900">แจ้งซ่อมล่าสุด</h2>
        <Link href="/maintenance?tab=all" className="text-sm text-indigo-600 hover:underline">
          ดูทั้งหมด →
        </Link>
      </div>
      <RequestTable rows={data.recent} emptyText="ยังไม่มีการแจ้งซ่อมในช่วงเวลานี้" />
    </>
  );
}
