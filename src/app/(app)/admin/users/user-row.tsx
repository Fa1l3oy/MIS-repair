"use client";

import { Check, KeyRound, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import type { Role } from "@/generated/prisma/enums";
import { ROLE_LABEL } from "@/lib/labels";
import { formatPhone } from "@/lib/limits";
import { ROLES } from "@/lib/validation";
import { changeUserRole, resetUserPassword, setUserActive } from "./actions";

type Row = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  department: string | null;
  role: Role;
  isActive: boolean;
  reported: number;
  openJobs: number;
};

type Result = { ok: boolean; error?: string; message?: string };

export function UserRow({ user, isSelf }: { user: Row; isSelf: boolean }) {
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = useTransition();
  const [showReset, setShowReset] = useState(false);
  const [password, setPassword] = useState("");

  function run(fn: () => Promise<Result>, after?: () => void) {
    startTransition(async () => {
      const res = await fn();
      setFeedback({ ok: res.ok, text: (res.ok ? res.message : res.error) ?? "" });
      if (res.ok) after?.();
    });
  }

  function onRoleChange(role: Role) {
    const warnJobs =
      role === "USER" && user.openJobs > 0 ? `\n\nงานที่ค้างอยู่ ${user.openJobs} งานจะถูกคืนเข้าคิวให้ช่างท่านอื่นรับแทน` : "";
    if (!confirm(`เปลี่ยนสิทธิ์ของ ${user.name} เป็น "${ROLE_LABEL[role]}" ?${warnJobs}`)) return;
    run(() => changeUserRole(user.id, role));
  }

  function onToggleActive() {
    if (user.isActive) {
      const warnJobs = user.openJobs > 0 ? `\n\nงานที่ค้างอยู่ ${user.openJobs} งานจะถูกคืนเข้าคิว` : "";
      if (!confirm(`ระงับบัญชีของ ${user.name}? ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้${warnJobs}`)) return;
    }
    run(() => setUserActive(user.id, !user.isActive));
  }

  return (
    <tr className={`align-middle transition ${user.isActive ? "hover:bg-zinc-50/70" : "bg-zinc-50/60"}`}>
      <td className="px-5 py-3.5">
        <div className={`flex items-center gap-3 ${user.isActive ? "" : "opacity-60"}`}>
          <Avatar name={user.name} />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-medium text-zinc-900">
              <span className="truncate">{user.name}</span>
              {isSelf && <span className="badge bg-zinc-100 px-1.5 py-0 text-[11px] text-zinc-600 ring-zinc-500/15">คุณ</span>}
            </p>
            <p className="truncate text-xs text-zinc-500">{user.email}</p>
          </div>
        </div>
        {feedback && (
          <p className={`mt-1.5 text-xs font-medium ${feedback.ok ? "text-emerald-600" : "text-rose-600"}`}>{feedback.text}</p>
        )}
      </td>
      <td className="px-4 py-3.5 text-zinc-700">
        {user.department ?? <span className="text-zinc-400">-</span>}
        {user.phone && <span className="block text-xs text-zinc-400">{formatPhone(user.phone)}</span>}
      </td>
      <td className="px-4 py-3.5 text-xs whitespace-nowrap text-zinc-500 tabular-nums">
        แจ้งซ่อม {user.reported}
        {user.role !== "USER" && <span className="block">งานค้าง {user.openJobs}</span>}
      </td>
      <td className="px-4 py-3.5">
        <select
          className="input w-40 py-1.5"
          value={user.role}
          disabled={isSelf || pending}
          onChange={(e) => onRoleChange(e.target.value as Role)}
          aria-label={`สิทธิ์ของ ${user.name}`}
          title={isSelf ? "ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้" : undefined}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2.5" title={isSelf ? "ไม่สามารถระงับบัญชีของตัวเองได้" : undefined}>
          <Switch
            checked={user.isActive}
            onChange={onToggleActive}
            disabled={isSelf || pending}
            label={user.isActive ? `ระงับบัญชีของ ${user.name}` : `เปิดใช้งานบัญชีของ ${user.name}`}
          />
          <span className={`text-xs font-medium whitespace-nowrap ${user.isActive ? "text-emerald-700" : "text-zinc-500"}`}>
            {user.isActive ? "ใช้งานอยู่" : "ถูกระงับ"}
          </span>
        </div>
      </td>
      <td className="px-5 py-3.5 text-right">
        {showReset ? (
          <form
            className="flex items-center justify-end gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () => resetUserPassword(user.id, password),
                () => {
                  setShowReset(false);
                  setPassword("");
                },
              );
            }}
          >
            <input
              type="text"
              className="input w-36 py-1.5"
              placeholder="รหัสผ่านใหม่"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              autoFocus
              aria-label="รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)"
            />
            <button type="submit" className="btn-primary size-9 px-0" disabled={pending || password.length < 8} aria-label="บันทึกรหัสผ่าน">
              <Check className="size-4" />
            </button>
            <button type="button" className="btn-icon size-9" onClick={() => setShowReset(false)} aria-label="ยกเลิก">
              <X className="size-4" />
            </button>
          </form>
        ) : (
          <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => setShowReset(true)}>
            <KeyRound className="size-3.5" />
            ตั้งรหัสผ่านใหม่
          </button>
        )}
      </td>
    </tr>
  );
}
