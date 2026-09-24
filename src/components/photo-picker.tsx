"use client";

import { Camera, CameraOff, ImagePlus, LoaderCircle, X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

export type PickedPhoto = { id: string; file: File; url: string };

/**
 * Vercel rejects request bodies over 4.5 MB, and all photos of a form travel in
 * one request. Each photo is squeezed under PHOTO_BUDGET (5 × 700 KB plus form
 * fields stays well below the limit) and forms refuse to send more than
 * MAX_UPLOAD_BYTES in total.
 */
const PHOTO_BUDGET = 700 * 1024;
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Longest side (px) and JPEG quality, tried in order until the photo fits the budget. */
const COMPRESSION_STEPS: [number, number][] = [
  [1600, 0.82],
  [1600, 0.7],
  [1280, 0.7],
  [1024, 0.65],
  [800, 0.6],
];

export function totalPhotoBytes(photos: PickedPhoto[]) {
  return photos.reduce((n, p) => n + p.file.size, 0);
}

// Not crypto.randomUUID(): it only exists in secure contexts, and phones usually
// reach a dev/LAN server over plain http://<ip>.
let photoSeq = 0;
const nextPhotoId = () => `photo-${Date.now()}-${photoSeq++}`;

/** Downscales photos to JPEG in the browser so uploads stay small and fast on mobile data. */
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    if (file.type === "image/jpeg" && file.size <= PHOTO_BUDGET && longest <= COMPRESSION_STEPS[0][0]) return file;

    let smallest: Blob | null = null;
    for (const [maxSide, quality] of COMPRESSION_STEPS) {
      const scale = Math.min(1, maxSide / longest);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff"; // transparent PNG areas would otherwise turn black in JPEG
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
      if (!blob) break;
      smallest = blob;
      if (blob.size <= PHOTO_BUDGET) break;
    }
    if (!smallest) return file;
    return new File([smallest], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // Undecodable here (e.g. HEIC on desktop) — let the server validate it.
  } finally {
    bitmap?.close();
  }
}

export function PhotoPicker({
  photos,
  onChange,
  max = 5,
}: {
  photos: PickedPhoto[];
  onChange: React.Dispatch<React.SetStateAction<PickedPhoto[]>>;
  max?: number;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const captureInput = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const remaining = max - photos.length;

  async function addFiles(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    try {
      const compressed = await Promise.all(files.slice(0, max).map(compressImage));
      const added = compressed.map((file) => ({ id: nextPhotoId(), file, url: URL.createObjectURL(file) }));
      // Functional update: several camera shots may finish compressing concurrently.
      onChange((prev) => {
        const next = [...prev, ...added];
        next.slice(max).forEach((p) => URL.revokeObjectURL(p.url));
        return next.slice(0, max);
      });
    } finally {
      setBusy(false);
    }
  }

  function remove(id: string) {
    const p = photos.find((x) => x.id === id);
    if (p) URL.revokeObjectURL(p.url);
    onChange((prev) => prev.filter((x) => x.id !== id));
  }

  function openCamera() {
    // Live camera needs a secure context (https or localhost). Otherwise fall back
    // to the native capture input, which opens the camera app on phones.
    if (typeof navigator.mediaDevices?.getUserMedia === "function") setCameraOpen(true);
    else captureInput.current?.click();
  }

  const buttons = (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button type="button" onClick={openCamera} disabled={remaining <= 0 || busy} className="btn-primary">
        <Camera className="size-4" strokeWidth={2} />
        ถ่ายรูป
      </button>
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={remaining <= 0 || busy}
        className="btn-secondary"
      >
        <ImagePlus className="size-4" strokeWidth={2} />
        เลือกรูปจากเครื่อง
      </button>
    </div>
  );

  return (
    <div
      onDragOver={(e) => {
        if (remaining <= 0 || !e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/")));
      }}
      className={`rounded-2xl border-2 border-dashed p-4 transition sm:p-5 ${
        dragging ? "border-brand-400 bg-brand-50/60" : "border-zinc-200 bg-zinc-50/50"
      }`}
    >
      {photos.length === 0 ? (
        <div className="flex flex-col items-center py-4 text-center">
          <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-white text-zinc-500 shadow-soft ring-1 ring-zinc-200/80">
            {busy ? <LoaderCircle className="size-6 animate-spin" /> : <Camera className="size-6" strokeWidth={1.75} />}
          </span>
          <p className="text-sm font-medium text-zinc-900">
            {busy ? "กำลังประมวลผลรูป..." : "ถ่ายรูปหรือเลือกรูปอุปกรณ์ที่เสียหาย"}
          </p>
          <p className="mt-1 mb-4 text-xs text-zinc-500">
            <span className="hidden sm:inline">ลากไฟล์มาวางที่นี่ได้ · </span>JPG, PNG, WEBP · สูงสุด {max} รูป
          </p>
          {buttons}
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 sm:gap-3">
            {photos.map((p, i) => (
              <li
                key={p.id}
                className="group relative aspect-square overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200/80"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                <img src={p.url} alt={`รูปที่ ${i + 1}`} className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-zinc-900/60 text-white backdrop-blur-sm transition hover:bg-zinc-900/80"
                  aria-label={`ลบรูปที่ ${i + 1}`}
                >
                  <X className="size-4" strokeWidth={2.25} />
                </button>
              </li>
            ))}
            {busy && (
              <li className="flex aspect-square items-center justify-center rounded-xl bg-white ring-1 ring-zinc-200/80">
                <LoaderCircle className="size-5 animate-spin text-zinc-400" />
              </li>
            )}
          </ul>
          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-zinc-500">
              {photos.length}/{max} รูป{remaining > 0 ? ` · เพิ่มได้อีก ${remaining} รูป` : " · ครบจำนวนแล้ว"}
            </p>
            {remaining > 0 && buttons}
          </div>
        </>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        multiple
        hidden
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <input
        ref={captureInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      {cameraOpen && remaining > 0 && (
        <CameraModal
          onClose={() => setCameraOpen(false)}
          onCapture={(file) => addFiles([file])}
          onUnavailable={() => {
            setCameraOpen(false);
            captureInput.current?.click();
          }}
        />
      )}
    </div>
  );
}

function CameraModal({
  onClose,
  onCapture,
  onUnavailable,
}: {
  onClose: () => void;
  onCapture: (file: File) => void;
  onUnavailable: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();
  const [flash, setFlash] = useState(false);
  const handleUnavailable = useEffectEvent(onUnavailable);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err: DOMException) => {
        if (err.name === "NotFoundError" || err.name === "NotReadableError") handleUnavailable();
        else setError("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้กล้อง หรือเลือกรูปจากเครื่องแทน");
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
        setFlash(true);
        setTimeout(() => setFlash(false), 150);
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="ถ่ายรูป">
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {error ? (
          <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-white">
              <CameraOff className="size-6" strokeWidth={1.75} />
            </span>
            <p className="text-sm text-white/80">{error}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => setReady(true)}
            className="size-full object-contain"
          />
        )}
        {flash && <div className="absolute inset-0 bg-white/70" />}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 flex size-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
          aria-label="ปิดกล้อง"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="flex items-center justify-between gap-4 bg-black px-6 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <span className="w-24" />
        <button
          type="button"
          onClick={capture}
          disabled={!ready}
          className="flex size-18 items-center justify-center rounded-full border-4 border-white/90 transition active:scale-95 disabled:opacity-40"
          aria-label="ถ่ายรูป"
        >
          <span className="size-14 rounded-full bg-white transition hover:bg-white/85" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-24 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20"
        >
          เสร็จสิ้น
        </button>
      </div>
    </div>
  );
}
