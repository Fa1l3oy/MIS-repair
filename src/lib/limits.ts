/**
 * Field rules shared by validation (lib/validation.ts and the actions), the form
 * inputs (minLength / maxLength / min / max) and the database, which enforces
 * the same limits with VARCHAR sizes and CHECK constraints (migration
 * `field_limits`). Change them together.
 */

/** [min, max] length in characters, counted after trimming. */
export const LEN = {
  personName: [2, 100],
  email: [6, 254],
  department: [2, 100],
  buildingName: [2, 100],
  buildingCode: [1, 10],
  categoryName: [2, 100],
  equipment: [2, 150],
  assetNumber: [2, 50],
  location: [2, 150],
  description: [5, 2000],
  statusNote: [1, 1000],
  comment: [1, 1000],
  cancelReason: [1, 500],
  feedback: [1, 500],
} as const satisfies Record<string, readonly [number, number]>;

/** Floors are whole numbers: 1, 2, 3 ... · 0 = G (ground) · -1 … -5 = basements B1 … B5. */
export const FLOOR = { min: -5, max: 99 } as const;
export const RATING = { min: 1, max: 5 } as const;

/**
 * Thai phone numbers are stored as digits only — 10 for mobiles (08x…), 9 for
 * landlines (02…). Kept as text rather than a number: an integer would drop
 * the leading 0 and can't hold every valid number.
 */
export const PHONE_PATTERN = /^0\d{8,9}$/;
/** Building codes such as "B01" or "ENG-2". */
export const BUILDING_CODE_PATTERN = /^[A-Z0-9-]+$/;

/** "081-234-5678", "02 123 4567" or "+66 81 234 5678" → "0812345678". */
export function normalizePhone(value: string) {
  return value.trim().replace(/^\+66/, "0").replace(/[\s().-]/g, "");
}

/**
 * "0812345678" → "081-234-5678" · Bangkok "021234567" → "02-123-4567" ·
 * provinces "053873000" → "053-873-000" (anything else unchanged).
 */
export function formatPhone(phone: string) {
  if (/^0\d{9}$/.test(phone)) return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
  if (/^02\d{7}$/.test(phone)) return `${phone.slice(0, 2)}-${phone.slice(2, 5)}-${phone.slice(5)}`;
  if (/^0\d{8}$/.test(phone)) return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
  return phone;
}

/** 3 → "3" · 0 → "G" · -1 → "B1" */
export function floorLabel(floor: number) {
  return floor > 0 ? String(floor) : floor === 0 ? "G" : `B${-floor}`;
}

/** "ชั้น 3", or "" when the floor is unknown. */
export function floorText(floor: number | null | undefined) {
  return floor === null || floor === undefined ? "" : `ชั้น ${floorLabel(floor)}`;
}
