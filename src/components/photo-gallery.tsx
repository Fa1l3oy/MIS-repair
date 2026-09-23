export function PhotoGallery({ images, emptyText }: { images: { id: string; filename: string }[]; emptyText?: string }) {
  if (images.length === 0) return emptyText ? <p className="text-sm text-slate-400">{emptyText}</p> : null;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {images.map((img) => (
        <li key={img.id}>
          <a
            href={`/api/uploads/${img.filename}`}
            target="_blank"
            rel="noreferrer"
            className="block aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
            title="เปิดรูปขนาดเต็ม"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- auth-protected upload route */}
            <img
              src={`/api/uploads/${img.filename}`}
              alt="รูปประกอบงานซ่อม"
              className="h-full w-full object-cover transition hover:scale-105"
              loading="lazy"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
