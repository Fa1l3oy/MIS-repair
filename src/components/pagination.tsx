import { ChevronLeft, ChevronRight } from "lucide-react";
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
    <nav className="mt-5 flex items-center justify-between text-sm" aria-label="เปลี่ยนหน้า">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="btn-secondary">
          <ChevronLeft className="size-4" />
          ก่อนหน้า
        </Link>
      ) : (
        <span />
      )}
      <span className="text-zinc-500 tabular-nums">
        หน้า {page} จาก {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className="btn-secondary">
          ถัดไป
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
