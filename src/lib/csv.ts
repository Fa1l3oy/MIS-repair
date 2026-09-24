type Cell = string | number | null | undefined;

/**
 * Spreadsheet-friendly CSV: a UTF-8 BOM so Excel reads Thai correctly, CRLF
 * line endings, and quoting where needed. Text that a spreadsheet would run as
 * a formula (=, +, -, @ ...) is prefixed with ' — user input ends up in here.
 */
export function toCsv(rows: Cell[][]) {
  return "﻿" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function csvCell(value: Cell) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) || text !== text.trim() ? `"${text.replaceAll('"', '""')}"` : text;
}

const PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "2026-09-24 14:05" in Bangkok time — a format spreadsheets parse as a date. */
export function csvDate(date: Date | null | undefined) {
  if (!date) return "";
  const p = Object.fromEntries(PARTS.formatToParts(date).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}
