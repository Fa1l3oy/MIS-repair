import Link from "next/link";

export function Pagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-between text-sm" aria-label="เปลี่ยนหน้า">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="btn-secondary">
          ← ก่อนหน้า
        </Link>
      ) : (
        <span />
      )}
      <span className="text-slate-500">
        หน้า {page} / {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className="btn-secondary">
          ถัดไป →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
