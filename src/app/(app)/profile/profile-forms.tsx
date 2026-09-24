"use client";

import { KeyRound, LoaderCircle, UserRound, type LucideIcon } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { FieldError } from "@/components/field-error";
import { formatPhone, LEN } from "@/lib/limits";
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

function SectionTitle({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
        <Icon className="size-[18px]" strokeWidth={1.75} />
      </span>
      <div>
        <h2 className="font-semibold text-zinc-900">{title}</h2>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

function Feedback({ feedback }: { feedback?: { ok: boolean; text: string } }) {
  if (!feedback) return null;
  return <Alert tone={feedback.ok ? "success" : "error"}>{feedback.text}</Alert>;
}

export function ProfileForm({
  profile,
}: {
  profile: { name: string; email: string; phone: string | null; department: string | null };
}) {
  const { ref, onSubmit, fieldErrors, feedback, pending } = useFormAction(updateProfile);
  return (
    <form ref={ref} onSubmit={onSubmit} className="card space-y-5 p-5 sm:p-6" noValidate>
      <SectionTitle icon={UserRound} title="ข้อมูลส่วนตัว" description="ชื่อและช่องทางติดต่อที่ช่างจะเห็นในใบแจ้งซ่อม" />
      <Feedback feedback={feedback} />
      <div>
        <label className="label" htmlFor="p-email">
          อีเมล (ใช้เข้าสู่ระบบ)
        </label>
        <input id="p-email" className="input" value={profile.email} disabled readOnly />
      </div>
      <div>
        <label className="label" htmlFor="p-name">
          ชื่อ-นามสกุล <span className="text-rose-500">*</span>
        </label>
        <input id="p-name" name="name" className="input" minLength={LEN.personName[0]} maxLength={LEN.personName[1]} defaultValue={profile.name} />
        <FieldError errors={fieldErrors.name} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="p-phone">
            เบอร์โทรศัพท์
          </label>
          <input
            id="p-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            maxLength={16}
            className="input"
            placeholder="เช่น 081-234-5678"
            defaultValue={profile.phone ? formatPhone(profile.phone) : ""}
          />
          <FieldError errors={fieldErrors.phone} />
        </div>
        <div>
          <label className="label" htmlFor="p-department">
            หน่วยงาน/คณะ
          </label>
          <input id="p-department" name="department" className="input" maxLength={LEN.department[1]} defaultValue={profile.department ?? ""} />
          <FieldError errors={fieldErrors.department} />
        </div>
      </div>
      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          บันทึกข้อมูล
        </button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const { ref, onSubmit, fieldErrors, feedback, pending } = useFormAction(changePassword, true);
  return (
    <form ref={ref} onSubmit={onSubmit} className="card space-y-5 p-5 sm:p-6" noValidate>
      <SectionTitle icon={KeyRound} title="เปลี่ยนรหัสผ่าน" description="ใช้อย่างน้อย 8 ตัวอักษร" />
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
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          เปลี่ยนรหัสผ่าน
        </button>
      </div>
    </form>
  );
}
