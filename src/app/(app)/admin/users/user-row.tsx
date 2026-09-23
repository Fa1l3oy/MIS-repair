"use client";

import { useState, useTransition } from "react";
import type { Role } from "@/generated/prisma/enums";
import { ROLE_LABEL } from "@/lib/labels";
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
    <tr className={user.isActive ? "" : "bg-slate-50/80 text-slate-400"}>
      <td className="px-4 py-3 align-top">
        <p className="font-medium text-slate-900">
          {user.name}
          {isSelf && <span className="ml-1.5 text-xs font-normal text-indigo-600">(คุณ)</span>}
        </p>
        <p className="text-xs text-slate-500">{user.email}</p>
        {feedback && (
          <p className={`mt-1 text-xs ${feedback.ok ? "text-emerald-600" : "text-rose-600"}`}>{feedback.text}</p>
        )}
      </td>
      <td className="px-4 py-3 align-top text-slate-600">
        {user.department ?? "-"}
        {user.phone && <span className="block text-xs text-slate-400">{user.phone}</span>}
      </td>
      <td className="px-4 py-3 align-top text-xs text-slate-500">
        แจ้งซ่อม {user.reported}
        {user.role !== "USER" && <span className="block">งานค้าง {user.openJobs}</span>}
      </td>
      <td className="px-4 py-3 align-top">
        <select
          className="input w-44 py-1.5"
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
      <td className="px-4 py-3 align-top">
        <button
          type="button"
          onClick={onToggleActive}
          disabled={isSelf || pending}
          className={`badge cursor-pointer disabled:cursor-not-allowed ${
            user.isActive ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"
          }`}
          title={isSelf ? undefined : user.isActive ? "คลิกเพื่อระงับบัญชี" : "คลิกเพื่อเปิดใช้งาน"}
        >
          {user.isActive ? "● ใช้งานอยู่" : "● ถูกระงับ"}
        </button>
      </td>
      <td className="px-4 py-3 text-right align-top">
        {showReset ? (
          <form
            className="flex items-center justify-end gap-1"
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
              aria-label="รหัสผ่านใหม่"
            />
            <button type="submit" className="btn-primary px-3 py-1.5" disabled={pending || password.length < 8}>
              บันทึก
            </button>
            <button type="button" className="btn-secondary px-3 py-1.5" onClick={() => setShowReset(false)}>
              ✕
            </button>
          </form>
        ) : (
          <button type="button" className="text-xs text-indigo-600 hover:underline" onClick={() => setShowReset(true)}>
            ตั้งรหัสผ่านใหม่
          </button>
        )}
      </td>
    </tr>
  );
}
