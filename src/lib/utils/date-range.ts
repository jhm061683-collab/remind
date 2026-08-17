/** KST 기준 날짜 키 (YYYY-MM-DD) */
export function toDateKey(date: Date | string): string {
  const source = typeof date === "string" ? new Date(date) : date;
  const kst = new Date(source.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 두 시각이 한국(Asia/Seoul) 기준 같은 날인지 */
export function isSameKstDay(
  iso: string,
  now: Date | string = new Date(),
): boolean {
  return toDateKey(iso) === toDateKey(now);
}

/** 한국 기준 오늘 0시 (UTC ISO) — DB 범위 조회용 */
export function startOfTodayKstIso(now = new Date()): string {
  return new Date(`${toDateKey(now)}T00:00:00+09:00`).toISOString();
}

/** 한국 기준 해당일 끝 (UTC ISO) */
export function endOfKstDayIso(dateKey: string): string {
  return new Date(`${dateKey}T23:59:59.999+09:00`).toISOString();
}

export type ConsultingPeriodPreset = "7d" | "14d" | "30d" | "month";

/** 상담 모달·보고서용 기간 (KST YYYY-MM-DD) */
export function resolveConsultingPeriod(
  preset: ConsultingPeriodPreset,
  now = new Date(),
): { start: string; end: string; periodDays: number; label: string } {
  const end = toDateKey(now);
  if (preset === "month") {
    const start = `${end.slice(0, 7)}-01`;
    const startMs = new Date(`${start}T00:00:00+09:00`).getTime();
    const endMs = new Date(`${end}T00:00:00+09:00`).getTime();
    const periodDays =
      Math.floor((endMs - startMs) / (24 * 60 * 60 * 1000)) + 1;
    return { start, end, periodDays: Math.max(1, periodDays), label: "이번 달" };
  }
  const days = preset === "7d" ? 7 : preset === "14d" ? 14 : 30;
  const endDate = new Date(`${end}T12:00:00+09:00`);
  const startDate = new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const start = toDateKey(startDate);
  return {
    start,
    end,
    periodDays: days,
    label: `최근 ${days}일`,
  };
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
