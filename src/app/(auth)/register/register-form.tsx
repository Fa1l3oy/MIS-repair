"use client";

import { signIn } from "next-auth/react";
import { useState, useTransition } from "react";
import { FieldError } from "@/components/field-error";
import type { FieldErrors } from "@/lib/validation";
import { registerAction } from "./actions";

export function RegisterForm() {
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await registerAction(formData);
      if (!res.ok) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        return;
      }
      const login = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
      });
      window.location.href = login?.ok ? "/" : "/login?registered=1";
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <div>
        <label htmlFor="name" className="label">ชื่อ-นามสกุล *</label>
        <input id="name" name="name" required className="input" />
        <FieldError errors={fieldErrors.name} />
      </div>
      <div>
        <label htmlFor="email" className="label">อีเมล *</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        <FieldError errors={fieldErrors.email} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="label">เบอร์โทรศัพท์</label>
          <input id="phone" name="phone" type="tel" className="input" />
          <FieldError errors={fieldErrors.phone} />
        </div>
        <div>
          <label htmlFor="department" className="label">หน่วยงาน/คณะ</label>
          <input id="department" name="department" className="input" />
          <FieldError errors={fieldErrors.department} />
        </div>
      </div>
      <div>
        <label htmlFor="password" className="label">รหัสผ่าน *</label>
        <input id="password" name="password" type="password" required autoComplete="new-password" className="input" />
        <FieldError errors={fieldErrors.password} />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="label">ยืนยันรหัสผ่าน *</label>
        <input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" className="input" />
        <FieldError errors={fieldErrors.confirmPassword} />
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
      </button>
    </form>
  );
}
