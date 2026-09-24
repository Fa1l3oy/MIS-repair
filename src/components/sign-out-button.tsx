"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { disablePush } from "./pwa/pwa-client";

export function SignOutButton({ variant = "icon" }: { variant?: "icon" | "row" }) {
  const onClick = async () => {
    // Nobody is signed in here any more, so this browser must stop receiving
    // that person's notifications. Don't let a slow push service block sign-out.
    await Promise.race([disablePush().catch(() => {}), new Promise((r) => setTimeout(r, 1500))]);
    await signOut({ callbackUrl: "/login" });
  };
  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
      >
        <LogOut className="size-[18px]" strokeWidth={1.75} />
        ออกจากระบบ
      </button>
    );
  }
  return (
    <button type="button" onClick={onClick} className="btn-icon size-9" aria-label="ออกจากระบบ" title="ออกจากระบบ">
      <LogOut className="size-4" strokeWidth={1.75} />
    </button>
  );
}
