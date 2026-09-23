"use client";

import { useRef, useState, useTransition } from "react";
import { FieldError } from "@/components/field-error";
import { ROLE_LABEL } from "@/lib/labels";
import { ROLES, type FieldErrors } from "@/lib/validation";
import { createUserByAdmin } from "./actions";

export function CreateUserForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createUserByAdmin(fd);
      if (!res.ok) {
        setFieldErrors(res.fieldErrors ?? {});
        setFeedback({ ok: false, text: res.error });
        return;
      }
      setFieldErrors({});
      setFeedback({ ok: true, text: res.message ?? "เพิ่มผู้ใช้แล้ว" });
      formRef.current?.reset();
    });
  }

  if (!open) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3">
        {feedback?.ok ? <p className="text-sm text-emerald-600">{feedback.text}</p> : <span />}
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
          + เพิ่มผู้ใช้
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={submit} className="card mb-4 space-y-4 p-5" noValidate>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">เพิ่มผู้ใช้ใหม่</h2>
        <button type="button" className="text-sm text-slate-500 hover:text-slate-800" onClick={() => setOpen(false)}>
          ปิด ✕
        </button>
      </div>
      {feedback && (
        <p className={`rounded-lg px-3 py-2 text-sm ${feedback.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {feedback.text}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor="new-name" className="label">
            ชื่อ-นามสกุล *
          </label>
          <input id="new-name" name="name" className="input" />
          <FieldError errors={fieldErrors.name} />
        </div>
        <div>
          <label htmlFor="new-email" className="label">
            อีเมล *
          </label>
          <input id="new-email" name="email" type="email" className="input" autoComplete="off" />
          <FieldError errors={fieldErrors.email} />
        </div>
        <div>
          <label htmlFor="new-role" className="label">
            สิทธิ์การใช้งาน *
          </label>
          <select id="new-role" name="role" className="input" defaultValue="USER">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <FieldError errors={fieldErrors.role} />
        </div>
        <div>
          <label htmlFor="new-department" className="label">
            หน่วยงาน
          </label>
          <input id="new-department" name="department" className="input" />
        </div>
        <div>
          <label htmlFor="new-phone" className="label">
            เบอร์โทรศัพท์
          </label>
          <input id="new-phone" name="phone" className="input" />
        </div>
        <div>
          <label htmlFor="new-password" className="label">
            รหัสผ่านเริ่มต้น *
          </label>
          <input id="new-password" name="password" type="text" className="input" autoComplete="new-password" />
          <FieldError errors={fieldErrors.password} />
        </div>
      </div>
      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "กำลังบันทึก..." : "บันทึกผู้ใช้"}
        </button>
      </div>
    </form>
  );
}
