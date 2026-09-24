/** Shown instantly while a page's server data loads, so navigation feels immediate. */
export default function Loading() {
  const bar = "animate-pulse rounded-lg bg-zinc-200/70";
  return (
    <div aria-busy="true" aria-label="กำลังโหลด">
      <div className={`${bar} h-8 w-56`} />
      <div className={`${bar} mt-3 h-4 w-80 max-w-full`} />
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-28 p-5">
            <div className={`${bar} h-3.5 w-24`} />
            <div className={`${bar} mt-4 h-7 w-12`} />
          </div>
        ))}
      </div>
      <div className="card mt-6 divide-y divide-zinc-100">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className={`${bar} size-12 rounded-xl`} />
            <div className="flex-1 space-y-2">
              <div className={`${bar} h-4 w-1/3`} />
              <div className={`${bar} h-3 w-1/2`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
