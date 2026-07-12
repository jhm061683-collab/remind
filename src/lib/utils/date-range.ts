/** KST 기준 날짜 키 (YYYY-MM-DD) */
export function toDateKey(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** 월요일 00:00 KST */
export function getWeekStart(date = new Date()): Date {
  const key = toDateKey(date);
  const local = parseDateKey(key);
  const day = local.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  local.setDate(local.getDate() + diff);
  local.setHours(0, 0, 0, 0);
  return local;
}

export function getWeekEnd(weekStart: Date): Date {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function isInRange(iso: string, start: Date, end: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export function formatWeekLabel(weekStart: Date): string {
  const month = weekStart.getMonth() + 1;
  const firstOfMonth = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
  const firstMonday = getWeekStart(firstOfMonth);
  const weekNum =
    Math.floor((weekStart.getTime() - firstMonday.getTime()) / (7 * 86400000)) + 1;
  return `${month}월 ${Math.max(1, weekNum)}주`;
}
