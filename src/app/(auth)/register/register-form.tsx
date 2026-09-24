"use client";

import { Building2, LoaderCircle, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState, useTransition } from "react";
import { FieldError } from "@/components/field-error";
import { Alert } from "@/components/ui/alert";
import { IconInput } from "@/components/ui/icon-input";
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
      {error && <Alert tone="error">{error}</Alert>}
      <div>
        <label htmlFor="name" className="label">
          ชื่อ-นามสกุล
        </label>
        <IconInput icon={UserRound} id="name" name="name" required autoComplete="name" placeholder="ชื่อ นามสกุล" />
        <FieldError errors={fieldErrors.name} />
      </div>
      <div>
        <label htmlFor="email" className="label">
          อีเมล
        </label>
        <IconInput icon={Mail} id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
        <FieldError errors={fieldErrors.email} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="label">
            เบอร์โทรศัพท์ <span className="font-normal text-zinc-400">(ถ้ามี)</span>
          </label>
          <IconInput icon={Phone} id="phone" name="phone" type="tel" autoComplete="tel" />
          <FieldError errors={fieldErrors.phone} />
        </div>
        <div>
          <label htmlFor="department" className="label">
            หน่วยงาน/คณะ <span className="font-normal text-zinc-400">(ถ้ามี)</span>
          </label>
          <IconInput icon={Building2} id="department" name="department" autoComplete="organization" />
          <FieldError errors={fieldErrors.department} />
        </div>
      </div>
      <div>
        <label htmlFor="password" className="label">
          รหัสผ่าน
        </label>
        <IconInput
          icon={LockKeyhole}
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="อย่างน้อย 8 ตัวอักษร"
        />
        <FieldError errors={fieldErrors.password} />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="label">
          ยืนยันรหัสผ่าน
        </label>
        <IconInput icon={LockKeyhole} id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
        <FieldError errors={fieldErrors.confirmPassword} />
      </div>
      <button type="submit" disabled={pending} className="btn-primary h-11 w-full">
        {pending && <LoaderCircle className="size-4 animate-spin" />}
        {pending ? "กำลังสร้างบัญชี..." : "สมัครสมาชิก"}
      </button>
    </form>
  );
}
