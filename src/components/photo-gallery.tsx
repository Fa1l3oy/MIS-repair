import { Expand, ImageOff } from "lucide-react";

export function PhotoGallery({ images, emptyText }: { images: { id: string; filename: string }[]; emptyText?: string }) {
  if (images.length === 0) {
    return emptyText ? (
      <p className="flex items-center gap-2 text-sm text-zinc-400">
        <ImageOff className="size-4" strokeWidth={1.75} />
        {emptyText}
      </p>
    ) : null;
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {images.map((img, i) => (
        <li key={img.id}>
          <a
            href={`/api/uploads/${img.filename}`}
            target="_blank"
            rel="noreferrer"
            className="group relative block aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200/80"
            title="เปิดรูปขนาดเต็ม"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- auth-protected upload route */}
            <img
              src={`/api/uploads/${img.filename}`}
              alt={`รูปประกอบที่ ${i + 1}`}
              className="size-full object-cover transition duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <span className="absolute right-2 bottom-2 flex size-7 items-center justify-center rounded-lg bg-zinc-900/50 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
              <Expand className="size-3.5" />
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
