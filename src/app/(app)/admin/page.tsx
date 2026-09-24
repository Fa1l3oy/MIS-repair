import { ArrowRight, CircleCheck, ClipboardList, Hourglass, Star, Timer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BarList, ColumnChart } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { RequestTable } from "@/components/request-table";
import { Avatar } from "@/components/ui/avatar";
import { SegmentedLinks } from "@/components/ui/segmented";
import { StatCard } from "@/components/ui/stat-card";
import { foldTail, formatHours, getDashboardData, RANGES, type RangeKey } from "@/lib/dashboard";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/labels";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "แดชบอร์ด" };

const nf = new Intl.NumberFormat("th-TH");

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
      <div className="mt-5">{children}</div>
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
      <PageHeader
        title="แดชบอร์ด"
        description="ภาพรวมงานแจ้งซ่อมและประสิทธิภาพการซ่อมบำรุง"
        actions={
          <SegmentedLinks
            label="ช่วงเวลา"
            items={RANGES.map((r) => ({ href: `/admin?range=${r.key}`, label: r.label, active: r.key === rangeKey }))}
          />
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
        <StatCard label="ใบแจ้งซ่อม" value={nf.format(kpis.total)} hint={data.range.label} icon={ClipboardList} />
        <StatCard label="ยังไม่ปิดงาน" value={nf.format(kpis.open)} hint="รอรับเรื่อง / กำลังซ่อม" icon={Hourglass} tone="amber" />
        <StatCard
          label="ซ่อมเสร็จ"
          value={nf.format(kpis.completed)}
          hint={kpis.completionRate === null ? undefined : `${Math.round(kpis.completionRate * 100)}% ของงานที่ปิดแล้ว`}
          icon={CircleCheck}
          tone="emerald"
        />
        <StatCard label="เวลาซ่อมเฉลี่ย" value={formatHours(kpis.avgRepairHours)} hint="ตั้งแต่แจ้งจนซ่อมเสร็จ" icon={Timer} tone="sky" />
        <StatCard
          label="ความพึงพอใจ"
          value={kpis.avgRating === null ? "-" : `${kpis.avgRating.toFixed(1)} / 5`}
          hint={`จากการประเมิน ${nf.format(kpis.ratingCount)} ครั้ง`}
          icon={Star}
          tone="brand"
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

      <section className="card mb-8 overflow-hidden">
        <div className="px-5 pt-5 pb-4 sm:px-6">
          <h2 className="text-sm font-semibold text-zinc-900">ผลการปฏิบัติงานของช่าง</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            งานที่แจ้งเข้ามาใน{data.range.label === "ทั้งหมด" ? "ทุกช่วงเวลา" : data.range.label}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-y border-zinc-100 bg-zinc-50/70 text-xs text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-medium sm:px-6">ช่าง</th>
                <th className="px-4 py-3 text-right font-medium">ได้รับงาน</th>
                <th className="px-4 py-3 text-right font-medium">ซ่อมเสร็จ</th>
                <th className="px-4 py-3 text-right font-medium">ค้างอยู่</th>
                <th className="px-4 py-3 text-right font-medium">เวลาซ่อมเฉลี่ย</th>
                <th className="px-5 py-3 text-right font-medium sm:px-6">คะแนนเฉลี่ย</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 tabular-nums">
              {data.technicians.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50/70">
                  <td className="px-5 py-3 sm:px-6">
                    <span className="flex items-center gap-3">
                      <Avatar name={t.name} size="sm" />
                      <span className="font-medium text-zinc-900">{t.name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-700">{nf.format(t.assigned)}</td>
                  <td className="px-4 py-3 text-right text-zinc-700">{nf.format(t.completed)}</td>
                  <td className="px-4 py-3 text-right text-zinc-700">{nf.format(t.open)}</td>
                  <td className="px-4 py-3 text-right text-zinc-700">{formatHours(t.avg_hours)}</td>
                  <td className="px-5 py-3 text-right sm:px-6">
                    {t.avg_rating === null ? (
                      <span className="text-zinc-400">-</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-zinc-900">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        {t.avg_rating.toFixed(1)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.technicians.length === 0 && <p className="px-6 py-6 text-sm text-zinc-500">ยังไม่มีช่างซ่อมบำรุงในระบบ</p>}
      </section>

      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">แจ้งซ่อมล่าสุด</h2>
        <Link
          href="/maintenance?tab=all"
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900"
        >
          ดูทั้งหมด
          <ArrowRight className="size-4" />
        </Link>
      </div>
      <RequestTable rows={data.recent} emptyText="ยังไม่มีการแจ้งซ่อมในช่วงเวลานี้" />
    </>
  );
}
