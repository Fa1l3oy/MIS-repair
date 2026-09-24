import { z } from "zod";
import { BUILDING_CODE_PATTERN, FLOOR, LEN, normalizePhone, PHONE_PATTERN } from "./limits";

export type FieldErrors = Record<string, string[] | undefined>;
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export const passwordSchema = z
  .string()
  .min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
  .max(72, "รหัสผ่านยาวได้ไม่เกิน 72 ตัวอักษร");

/** Trimmed text with a [min, max] length from lib/limits.ts and Thai error messages. */
export function text([min, max]: readonly [number, number], label: string) {
  return z
    .string({ error: `กรุณากรอก${label}` })
    .trim()
    .min(min, min > 1 ? `${label}ต้องมีอย่างน้อย ${min} ตัวอักษร` : `กรุณากรอก${label}`)
    .max(max, `${label}ยาวได้ไม่เกิน ${max} ตัวอักษร`);
}

/** Optional Thai phone number; accepts dashes/spaces/+66 and stores digits only. */
export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .pipe(z.string().regex(PHONE_PATTERN, "เบอร์โทรต้องเป็นตัวเลข 9-10 หลักขึ้นต้นด้วย 0 เช่น 081-234-5678"))
  .optional();

/** Optional floor number (whole number, -5 … 99). */
export const floorSchema = z.coerce
  .number({ error: "ชั้นต้องเป็นตัวเลข" })
  .int("ชั้นต้องเป็นจำนวนเต็ม")
  .min(FLOOR.min, `ชั้นต้องอยู่ระหว่าง ${FLOOR.min} ถึง ${FLOOR.max} (ชั้นใต้ดินใส่ติดลบ)`)
  .max(FLOOR.max, `ชั้นต้องอยู่ระหว่าง ${FLOOR.min} ถึง ${FLOOR.max} (ชั้นใต้ดินใส่ติดลบ)`)
  .optional();

export const buildingCodeSchema = text(LEN.buildingCode, "รหัสอาคาร")
  .toUpperCase()
  .regex(BUILDING_CODE_PATTERN, "รหัสอาคารใช้ได้เฉพาะ A-Z ตัวเลข และ - เช่น B01")
  .optional();

const emailSchema = z
  .email("รูปแบบอีเมลไม่ถูกต้อง")
  .trim()
  .toLowerCase()
  .max(LEN.email[1], `อีเมลยาวได้ไม่เกิน ${LEN.email[1]} ตัวอักษร`);

/**
 * Server actions are public endpoints that accept any serialisable argument, so
 * ids passed as plain arguments must be checked: an object like `{ not: "" }`
 * would otherwise become a Prisma filter matching every row.
 */
const idSchema = z.string().min(1).max(64);
export function isId(value: unknown): value is string {
  return idSchema.safeParse(value).success;
}

export const registerSchema = z
  .object({
    name: text(LEN.personName, "ชื่อ-นามสกุล"),
    email: emailSchema,
    phone: phoneSchema,
    department: text(LEN.department, "หน่วยงาน").optional(),
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
  name: text(LEN.personName, "ชื่อ-นามสกุล"),
  phone: phoneSchema,
  department: text(LEN.department, "หน่วยงาน").optional(),
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
  name: text(LEN.personName, "ชื่อ-นามสกุล"),
  email: emailSchema,
  phone: phoneSchema,
  department: text(LEN.department, "หน่วยงาน").optional(),
  role: z.enum(ROLES, { error: "กรุณาเลือกสิทธิ์การใช้งาน" }),
  password: passwordSchema,
});

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const createRequestSchema = z.object({
  equipment: text(LEN.equipment, "อุปกรณ์ที่เสียหาย"),
  assetNumber: text(LEN.assetNumber, "เลขครุภัณฑ์").optional(),
  categoryId: z.string({ error: "กรุณาเลือกประเภทงาน" }).min(1, "กรุณาเลือกประเภทงาน"),
  buildingId: z.string({ error: "กรุณาเลือกอาคาร" }).min(1, "กรุณาเลือกอาคาร"),
  floor: floorSchema,
  location: text(LEN.location, "ห้อง/สถานที่"),
  priority: z.enum(PRIORITIES).default("MEDIUM"),
  qrTagId: z.string().max(32).optional(),
  description: text(LEN.description, "อาการเสีย"),
});
