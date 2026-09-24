"use client";

import { LoaderCircle, UserPlus } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { FieldError } from "@/components/field-error";
import { Alert } from "@/components/ui/alert";
import { Dialog } from "@/components/ui/dialog";
import { ROLE_LABEL } from "@/lib/labels";
import { ROLES, type FieldErrors } from "@/lib/validation";
import { createUserByAdmin } from "./actions";

export function CreateUserForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setFeedback(undefined);
    setFieldErrors({});
  }

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

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        <UserPlus className="size-4" strokeWidth={2} />
        เพิ่มผู้ใช้
      </button>

      <Dialog open={open} onClose={close} title="เพิ่มผู้ใช้ใหม่" description="กำหนดสิทธิ์และรหัสผ่านเริ่มต้นให้ผู้ใช้">
        <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
          {feedback && <Alert tone={feedback.ok ? "success" : "error"}>{feedback.text}</Alert>}
          <div>
            <label htmlFor="new-name" className="label">
              ชื่อ-นามสกุล <span className="text-rose-500">*</span>
            </label>
            <input id="new-name" name="name" className="input" autoFocus />
            <FieldError errors={fieldErrors.name} />
          </div>
          <div>
            <label htmlFor="new-email" className="label">
              อีเมล <span className="text-rose-500">*</span>
            </label>
            <input id="new-email" name="email" type="email" className="input" autoComplete="off" />
            <FieldError errors={fieldErrors.email} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="new-role" className="label">
                สิทธิ์การใช้งาน
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
              <label htmlFor="new-password" className="label">
                รหัสผ่านเริ่มต้น <span className="text-rose-500">*</span>
              </label>
              <input id="new-password" name="password" type="text" className="input" autoComplete="new-password" />
              <FieldError errors={fieldErrors.password} />
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
              <input id="new-phone" name="phone" type="tel" className="input" />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-ghost" onClick={close}>
              {feedback?.ok ? "เสร็จสิ้น" : "ยกเลิก"}
            </button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending && <LoaderCircle className="size-4 animate-spin" />}
              {feedback?.ok ? "เพิ่มอีกคน" : "บันทึกผู้ใช้"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
