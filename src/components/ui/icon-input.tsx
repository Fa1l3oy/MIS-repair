"use client";

import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { useState } from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { icon: LucideIcon };

/** Text input with a leading icon; password inputs get a show/hide toggle. */
export function IconInput({ icon: Icon, type, className = "", ...props }: InputProps) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400" strokeWidth={1.75} />
      <input
        {...props}
        type={isPassword && reveal ? "text" : type}
        className={`input h-11 pl-10 ${isPassword ? "pr-11" : ""} ${className}`}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          aria-label={reveal ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
        >
          {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      )}
    </div>
  );
}
