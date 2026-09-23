import { z } from "zod";

export type FieldErrors = Record<string, string[] | undefined>;
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export const passwordSchema = z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร").max(72);

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "กรุณากรอกชื่อ-นามสกุล").max(100),
    email: z.email("รูปแบบอีเมลไม่ถูกต้อง").trim().toLowerCase(),
    phone: z.string().trim().max(20).optional(),
    department: z.string().trim().max(100).optional(),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

/** Converts empty strings from FormData into undefined so optional fields validate. */
export function formToObject(formData: FormData) {
  const obj: Record<string, string | undefined> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") obj[key] = value.trim() === "" ? undefined : value;
  }
  return obj;
}

export function flattenErrors(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}

export const profileSchema = z.object({
  name: z.string({ error: "กรุณากรอกชื่อ-นามสกุล" }).trim().min(2, "กรุณากรอกชื่อ-นามสกุล").max(100),
  phone: z.string().trim().max(20).optional(),
  department: z.string().trim().max(100).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ error: "กรุณากรอกรหัสผ่านปัจจุบัน" }).min(1, "กรุณากรอกรหัสผ่านปัจจุบัน"),
    newPassword: passwordSchema,
    confirmPassword: z.string({ error: "กรุณายืนยันรหัสผ่าน" }),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "รหัสผ่านไม่ตรงกัน", path: ["confirmPassword"] });

export const ROLES = ["USER", "MAINTENANCE", "ADMIN"] as const;

export const adminCreateUserSchema = z.object({
  name: z.string({ error: "กรุณากรอกชื่อ-นามสกุล" }).trim().min(2, "กรุณากรอกชื่อ-นามสกุล").max(100),
  email: z.email("รูปแบบอีเมลไม่ถูกต้อง").trim().toLowerCase(),
  phone: z.string().trim().max(20).optional(),
  department: z.string().trim().max(100).optional(),
  role: z.enum(ROLES, { error: "กรุณาเลือกสิทธิ์การใช้งาน" }),
  password: passwordSchema,
});

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const createRequestSchema = z.object({
  equipment: z.string({ error: "กรุณาระบุอุปกรณ์ที่เสียหาย" }).trim().min(2, "กรุณาระบุอุปกรณ์ที่เสียหาย").max(150),
  assetNumber: z.string().trim().max(50).optional(),
  categoryId: z.string({ error: "กรุณาเลือกประเภทงาน" }).min(1, "กรุณาเลือกประเภทงาน"),
  buildingId: z.string({ error: "กรุณาเลือกอาคาร" }).min(1, "กรุณาเลือกอาคาร"),
  floor: z.string().trim().max(20).optional(),
  location: z.string({ error: "กรุณาระบุห้อง/สถานที่" }).trim().min(1, "กรุณาระบุห้อง/สถานที่").max(150),
  priority: z.enum(PRIORITIES).default("MEDIUM"),
  description: z
    .string({ error: "กรุณาอธิบายอาการเสีย" })
    .trim()
    .min(5, "กรุณาอธิบายอาการเสียอย่างน้อย 5 ตัวอักษร")
    .max(2000),
});
