import { format, parseISO } from "date-fns";

export function toDatetimeLocalValue(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toDateInputValue(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDatetimeLocal(value: string): Date | null {
  if (!value) return null;
  return new Date(value);
}

/** Parse yyyy-MM-dd as local calendar date (noon avoids DST edge cases). */
export function fromDateInput(value: string): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? parseISO(d) : d;
  return format(date, "dd.MM.yyyy HH:mm");
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? parseISO(d) : d;
  return format(date, "dd.MM.yyyy");
}

export function formatBookingWhen(
  date: Date | string | null | undefined,
  timeText?: string | null,
): string {
  const day = formatDate(date);
  if (day === "—") return "—";
  const t = timeText?.trim();
  return t ? `${day} · ${t}` : day;
}
