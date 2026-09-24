"use client";

import { ChevronLeft, ChevronRight, Expand, ExternalLink, ImageOff, X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

type Photo = { id: string; filename: string };

const src = (p: Photo) => `/api/uploads/${p.filename}`;

/** Thumbnail grid; a tap opens the full-screen viewer (ctrl/⌘-click still opens a new tab). */
export function PhotoGallery({ images, emptyText, label = "รูปภาพ" }: { images: Photo[]; emptyText?: string; label?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const thumbs = useRef<(HTMLAnchorElement | null)[]>([]);

  if (images.length === 0) {
    return emptyText ? (
      <p className="flex items-center gap-2 text-sm text-zinc-400">
        <ImageOff className="size-4" strokeWidth={1.75} />
        {emptyText}
      </p>
    ) : null;
  }

  function close(last: number) {
    setOpen(null);
    thumbs.current[last]?.focus(); // back to the photo the viewer ended on
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img, i) => (
          <li key={img.id}>
            <a
              ref={(el) => {
                thumbs.current[i] = el;
              }}
              href={src(img)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                setOpen(i);
              }}
              className="group relative block aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200/80"
              title="ดูรูปขนาดเต็ม"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- auth-protected upload route */}
              <img
                src={src(img)}
                alt={`${label}ที่ ${i + 1}`}
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
      {open !== null && <Lightbox images={images} start={open} label={label} onClose={close} />}
    </>
  );
}

function Lightbox({
  images,
  start,
  label,
  onClose,
}: {
  images: Photo[];
  start: number;
  label: string;
  onClose: (last: number) => void;
}) {
  const [index, setIndex] = useState(start);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);
  const many = images.length > 1;
  const go = (step: number) => setIndex((i) => (i + step + images.length) % images.length);

  // Keyboard, scroll lock and initial focus — bound once while the viewer is open.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose(index);
    else if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handler);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", handler);
    };
  }, []);

  // Warm the cache for the neighbours so swiping feels instant.
  useEffect(() => {
    if (!many) return;
    for (const step of [1, -1]) new Image().src = src(images[(index + step + images.length) % images.length]);
  }, [index, images, many]);

  const photo = images[Math.min(index, images.length - 1)];
  return (
    <div
      className="animate-fade-in fixed inset-0 z-[70] flex flex-col bg-zinc-950/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`${label} ${index + 1} จาก ${images.length}`}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null || !many) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <p className="text-sm text-white/70 tabular-nums">
          {label} · {index + 1} / {images.length}
        </p>
        <div className="flex items-center gap-1">
          <a
            href={src(photo)}
            target="_blank"
            rel="noreferrer"
            className="flex size-10 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="เปิดรูปต้นฉบับในแท็บใหม่"
            title="เปิดรูปต้นฉบับ"
          >
            <ExternalLink className="size-5" />
          </a>
          <button
            ref={closeRef}
            type="button"
            onClick={() => onClose(index)}
            className="flex size-10 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="ปิด"
          >
            <X className="size-6" />
          </button>
        </div>
      </div>

      {/* Clicking the dark area around the photo closes the viewer. */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.target === e.currentTarget && onClose(index)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- auth-protected upload route */}
        <img
          key={photo.id}
          src={src(photo)}
          alt={`${label}ที่ ${index + 1}`}
          className="animate-fade-in max-h-full max-w-full rounded-lg object-contain shadow-2xl select-none"
          draggable={false}
        />
        {many && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute top-1/2 left-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 backdrop-blur transition hover:bg-white/20 sm:left-6"
              aria-label="รูปก่อนหน้า"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute top-1/2 right-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 backdrop-blur transition hover:bg-white/20 sm:right-6"
              aria-label="รูปถัดไป"
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
