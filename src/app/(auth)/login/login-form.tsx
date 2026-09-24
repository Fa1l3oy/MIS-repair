"use client";

import { ArrowRight, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { IconInput } from "@/components/ui/icon-input";

export function LoginForm({ callbackUrl, initialError }: { callbackUrl: string; initialError?: string }) {
  const [error, setError] = useState(initialError);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(undefined);
    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });
    if (!res || res.error) {
      setPending(false);
      setError(res?.error && res.error !== "CredentialsSignin" ? res.error : "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }
    // Full reload so server components pick up the new session cookie.
    window.location.href = callbackUrl;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      <div>
        <label htmlFor="email" className="label">
          อีเมล
        </label>
        <IconInput icon={Mail} id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
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
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </div>
      <button type="submit" disabled={pending} className="btn-primary h-11 w-full">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        {!pending && <ArrowRight className="size-4" />}
      </button>
    </form>
  );
}
