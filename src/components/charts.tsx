/**
 * Small dependency-free charts for the admin dashboard.
 * Single-series only, so every mark uses --viz-series-1 and no legend is needed
 * (the card title names what is plotted). Values are always reachable without
 * hovering: max value is direct-labelled and each chart has a table view.
 */

const nf = new Intl.NumberFormat("th-TH");

/**
 * Clean 1/2/5 × 10^n axis ticks. The top tick is always above the maximum so the
 * tallest column keeps room for its direct label.
 */
function niceTicks(max: number, target = 4) {
  if (max <= 0) return [0, 1];
  const rough = max / target;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, Math.round([1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow));
  const ticks: number[] = [];
  for (let t = 0; t <= max; t += step) ticks.push(t);
  ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

export type ColumnPoint = { key: string; label: string; fullLabel: string; value: number };

export function ColumnChart({ points, unit = "รายการ" }: { points: ColumnPoint[]; unit?: string }) {
  const max = Math.max(0, ...points.map((p) => p.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const maxIndex = max > 0 ? points.findLastIndex((p) => p.value === max) : -1;
  const labelEvery = Math.max(1, Math.ceil(points.length / 7));

  return (
    <div className="viz">
      {/* pt-2 leaves room for the top tick label, which is centred on its gridline */}
      <div className="flex pt-2">
        {/* y-axis ticks */}
        <div className="relative h-44 w-8 shrink-0 text-right text-[11px] text-slate-500 tabular-nums" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-2 -translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>
              {nf.format(t)}
            </span>
          ))}
        </div>

        <div className="relative h-44 flex-1">
          {/* hairline gridlines; the zero line doubles as the baseline */}
          {ticks.map((t) => (
            <div
              key={t}
              aria-hidden
              className="absolute inset-x-0 h-px"
              style={{ bottom: `${(t / top) * 100}%`, background: t === 0 ? "var(--viz-baseline)" : "var(--viz-grid)" }}
            />
          ))}

          <ul className="absolute inset-0 flex items-end" aria-label="แผนภูมิแท่ง">
            {points.map((p, i) => {
              const h = (p.value / top) * 100;
              const align = i < 2 ? "left-0" : i > points.length - 3 ? "right-0" : "left-1/2 -translate-x-1/2";
              return (
                <li
                  key={p.key}
                  tabIndex={0}
                  aria-label={`${p.fullLabel}: ${nf.format(p.value)} ${unit}`}
                  className="group relative flex h-full flex-1 items-end justify-center px-px outline-none"
                >
                  <span
                    className="w-full max-w-6 rounded-t-[4px] transition-opacity group-hover:opacity-75 group-focus-visible:opacity-75"
                    style={{ height: p.value > 0 ? `max(${h}%, 2px)` : 0, background: "var(--viz-series-1)" }}
                  />
                  {i === maxIndex && (
                    <span
                      className="pointer-events-none absolute text-xs font-semibold text-slate-700 tabular-nums"
                      style={{ bottom: `calc(${h}% + 4px)` }}
                    >
                      {nf.format(p.value)}
                    </span>
                  )}
                  {/* tooltip: value leads, label follows */}
                  <span
                    role="tooltip"
                    className={`pointer-events-none absolute top-0 z-10 hidden rounded-md bg-slate-900 px-2.5 py-1.5 text-left whitespace-nowrap shadow-lg group-hover:block group-focus-visible:block ${align}`}
                  >
                    <span className="block text-sm font-semibold text-white">
                      {nf.format(p.value)} {unit}
                    </span>
                    <span className="block text-xs text-slate-300">{p.fullLabel}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* x-axis labels, thinned so they never collide; centred on their column, never clipped */}
      <div className="ml-8 flex h-6 text-[11px] text-slate-500" aria-hidden>
        {points.map((p, i) => {
          // Count back from the latest column so it is always labelled and spacing stays even.
          const show = (points.length - 1 - i) % labelEvery === 0;
          // Keep the first/last labels inside the chart instead of centring past its edge.
          const pos = i === 0 ? "left-0" : i === points.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2";
          return (
            <span key={p.key} className="relative flex-1">
              {show && <span className={`absolute top-1.5 whitespace-nowrap ${pos}`}>{p.label}</span>}
            </span>
          );
        })}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-800">ดูข้อมูลเป็นตาราง</summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="py-1 font-medium">ช่วงเวลา</th>
              <th className="py-1 text-right font-medium">จำนวน ({unit})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {points.map((p) => (
              <tr key={p.key}>
                <td className="py-1">{p.fullLabel}</td>
                <td className="py-1 text-right tabular-nums">{nf.format(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

export function BarList({
  rows,
  emptyText = "ยังไม่มีข้อมูล",
}: {
  rows: { label: string; value: number }[];
  emptyText?: string;
}) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  if (max === 0) return <p className="py-6 text-center text-sm text-slate-400">{emptyText}</p>;

  return (
    <ul className="viz space-y-1">
      {rows.map((r) => (
        <li
          key={r.label}
          className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 rounded-md px-1 py-1 hover:bg-slate-50"
        >
          <span className="truncate text-sm text-slate-600" title={r.label}>
            {r.label}
          </span>
          <span className="flex items-center gap-2">
            <span
              className="h-3 rounded-r-[4px]"
              style={{ width: r.value > 0 ? `max(${(r.value / max) * 85}%, 2px)` : 0, background: "var(--viz-series-1)" }}
            />
            <span className="text-sm font-medium text-slate-800 tabular-nums">{nf.format(r.value)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
