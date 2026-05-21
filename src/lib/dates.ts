import type { Recurrence } from "../types";

const dayInMs = 24 * 60 * 60 * 1000;

export function todayKey() {
  return toDateKey(new Date());
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(dateKey: string, days: number) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function addMonths(dateKey: string, months: number) {
  const date = parseDateKey(dateKey);
  const originalDay = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(originalDay, lastDay));
  return toDateKey(target);
}

export function addYears(dateKey: string, years: number) {
  return addMonths(dateKey, years * 12);
}

export function nextDateForRecurrence(dateKey: string, recurrence: Recurrence) {
  if (recurrence === "diário") return addDays(dateKey, 1);
  if (recurrence === "semanal") return addDays(dateKey, 7);
  if (recurrence === "mensal") return addMonths(dateKey, 1);
  if (recurrence === "anual") return addYears(dateKey, 1);
  return null;
}

export function diffInDays(targetKey: string, fromKey = todayKey()) {
  const target = parseDateKey(targetKey).getTime();
  const from = parseDateKey(fromKey).getTime();
  return Math.round((target - from) / dayInMs);
}

export function startOfWeek(dateKey: string) {
  const date = parseDateKey(dateKey);
  const diff = date.getDay();
  date.setDate(date.getDate() - diff);
  return toDateKey(date);
}

export function endOfWeek(dateKey: string) {
  return addDays(startOfWeek(dateKey), 6);
}

export function startOfMonth(dateKey: string) {
  const date = parseDateKey(dateKey);
  return toDateKey(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonth(dateKey: string) {
  const date = parseDateKey(dateKey);
  return toDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function monthGrid(dateKey: string) {
  const first = startOfMonth(dateKey);
  const last = endOfMonth(dateKey);
  const gridStart = startOfWeek(first);
  const gridEnd = endOfWeek(last);
  const days: string[] = [];
  let cursor = gridStart;

  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
}

export function getWeekDays(dateKey: string) {
  const start = startOfWeek(dateKey);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function isSameMonth(dayKey: string, baseKey: string) {
  const day = parseDateKey(dayKey);
  const base = parseDateKey(baseKey);
  return day.getFullYear() === base.getFullYear() && day.getMonth() === base.getMonth();
}

export function isWithinInclusive(dateKey: string, startKey: string, endKey: string) {
  return dateKey >= startKey && dateKey <= endKey;
}

export function formatShortDate(dateKey: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(parseDateKey(dateKey));
}

export function formatLongDate(dateKey: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parseDateKey(dateKey));
}

export function formatMonthTitle(dateKey: string) {
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(parseDateKey(dateKey));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function monthKey(dateKey: string) {
  return dateKey.slice(0, 7);
}

export function alertLabel(dateKey: string) {
  const diff = diffInDays(dateKey);
  if (diff === 0) return "Hoje";
  if ([1, 7, 15, 30].includes(diff)) return `D-${diff}`;
  if (diff < 0) return `${Math.abs(diff)}d atraso`;
  return null;
}
