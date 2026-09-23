"use client";

import { useRef, useState, useTransition } from "react";
import { FieldError } from "@/components/field-error";
import type { ActionResult, FieldErrors } from "@/lib/validation";
import { changePassword, updateProfile } from "./actions";

function useFormAction(action: (fd: FormData) => Promise<ActionResult>, resetOnSuccess = false) {
  const ref = useRef<HTMLFormElement>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await action(fd);
      setFieldErrors(res.ok ? {} : (res.fieldErrors ?? {}));
      setFeedback({ ok: res.ok, text: (res.ok ? res.message : res.error) ?? "" });
      if (res.ok && resetOnSuccess) ref.current?.reset();
    });
  }
  return { ref, onSubmit, fieldErrors, feedback, pending };
}

function Feedback({ feedback }: { feedback?: { ok: boolean; text: string } }) {
  if (!feedback) return null;
  return (
    <p className={`rounded-lg px-3 py-2 text-sm ${feedback.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
      {feedback.text}
    </p>
  );
}

export function ProfileForm({
  profile,
}: {
  profile: { name: string; email: string; phone: string | null; department: string | null };
}) {
  const { ref, onSubmit, fieldErrors, feedback, pending } = useFormAction(updateProfile);
  return (
    <form ref={ref} onSubmit={onSubmit} className="card space-y-4 p-5 sm:p-6" noValidate>
      <h2 className="font-semibold">ข้อมูลส่วนตัว</h2>
      <Feedback feedback={feedback} />
      <div>
        <label className="label" htmlFor="p-email">
          อีเมล (ใช้เข้าสู่ระบบ)
        </label>
        <input id="p-email" className="input" value={profile.email} disabled readOnly />
      </div>
      <div>
        <label className="label" htmlFor="p-name">
          ชื่อ-นามสกุล *
        </label>
        <input id="p-name" name="name" className="input" defaultValue={profile.name} />
        <FieldError errors={fieldErrors.name} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="p-phone">
            เบอร์โทรศัพท์
          </label>
          <input id="p-phone" name="phone" type="tel" className="input" defaultValue={profile.phone ?? ""} />
          <FieldError errors={fieldErrors.phone} />
        </div>
        <div>
          <label className="label" htmlFor="p-department">
            หน่วยงาน/คณะ
          </label>
          <input id="p-department" name="department" className="input" defaultValue={profile.department ?? ""} />
          <FieldError errors={fieldErrors.department} />
        </div>
      </div>
      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
        </button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const { ref, onSubmit, fieldErrors, feedback, pending } = useFormAction(changePassword, true);
  return (
    <form ref={ref} onSubmit={onSubmit} className="card space-y-4 p-5 sm:p-6" noValidate>
      <h2 className="font-semibold">เปลี่ยนรหัสผ่าน</h2>
      <Feedback feedback={feedback} />
      <div>
        <label className="label" htmlFor="pw-current">
          รหัสผ่านปัจจุบัน
        </label>
        <input id="pw-current" name="currentPassword" type="password" className="input" autoComplete="current-password" />
        <FieldError errors={fieldErrors.currentPassword} />
      </div>
      <div>
        <label className="label" htmlFor="pw-new">
          รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)
        </label>
        <input id="pw-new" name="newPassword" type="password" className="input" autoComplete="new-password" />
        <FieldError errors={fieldErrors.newPassword} />
      </div>
      <div>
        <label className="label" htmlFor="pw-confirm">
          ยืนยันรหัสผ่านใหม่
        </label>
        <input id="pw-confirm" name="confirmPassword" type="password" className="input" autoComplete="new-password" />
        <FieldError errors={fieldErrors.confirmPassword} />
      </div>
      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
        </button>
      </div>
    </form>
  );
}
