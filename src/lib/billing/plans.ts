export type PlanCode = "basic" | "pro" | "premium";

export type PlanDefinition = {
  code: PlanCode;
  name: string;
  pricePerStudentKrw: number;
  /** 0이면 OCR 불가. null이면 제한 없음(현재 미사용) */
  ocrDailyLimit: number;
  description: string;
  highlight: boolean;
  features: string[];
};

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    code: "basic",
    name: "Basic",
    pricePerStudentKrw: 9900,
    ocrDailyLimit: 0,
    description: "OCR 없이 오답·복습을 무제한으로",
    highlight: false,
    features: [
      "학생당 월 9,900원",
      "오답 등록·복습 무제한",
      "AI로 읽기(OCR) 없음",
    ],
  },
  {
    code: "pro",
    name: "Pro",
    pricePerStudentKrw: 29000,
    ocrDailyLimit: 10,
    description: "OCR을 하루 최대 10문제까지",
    highlight: true,
    features: [
      "학생당 월 29,000원",
      "오답 등록·복습 무제한",
      "AI로 읽기 하루 최대 10문제",
    ],
  },
  {
    code: "premium",
    name: "Premium",
    pricePerStudentKrw: 49000,
    ocrDailyLimit: 20,
    description: "OCR을 하루 최대 20문제까지",
    highlight: false,
    features: [
      "학생당 월 49,000원",
      "오답 등록·복습 무제한",
      "AI로 읽기 하루 최대 20문제",
    ],
  },
];

export function getPlanDefinition(code: string | null | undefined): PlanDefinition | null {
  if (!code) return null;
  return PLAN_DEFINITIONS.find((p) => p.code === code) ?? null;
}

export function isPlanCode(value: string): value is PlanCode {
  return value === "basic" || value === "pro" || value === "premium";
}

/** 학생 수 × 1명당 단가 = 이번 달 예상 요금 */
export function estimateMonthlyPriceKrw(
  studentCount: number,
  pricePerStudentKrw: number,
): number {
  const count = Math.max(0, Math.floor(studentCount));
  const unit = Math.max(0, Math.floor(pricePerStudentKrw));
  return count * unit;
}

export function formatKrw(amount: number): string {
  const n = Math.floor(amount);
  const sign = n < 0 ? "-" : "";
  return `${sign}${Math.abs(n).toLocaleString("ko-KR")}원`;
}

export function normalizeAcademyCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * 학원 코드 규칙: 영문·숫자 4~12자 (숫자만도 OK)
 * 예: DEMO, GANGNAM, 2401, 123456
 */
export function validateAcademyCode(raw: string): string | null {
  const code = normalizeAcademyCode(raw);
  if (code.length < 4 || code.length > 12) {
    return "학원 코드는 4~12자로 입력해 주세요.";
  }
  if (!/^[A-Z0-9]+$/.test(code)) {
    return "학원 코드는 영문과 숫자만 사용할 수 있어요.";
  }
  if (code === "PLATFORM") {
    return "PLATFORM은 예약된 코드입니다.";
  }
  return null;
}

/** 기간 남은 일수 기준 일할 차액 (업그레이드 +, 다운그레이드 -) */
export function calcProrationKrw(input: {
  oldUnitKrw: number;
  newUnitKrw: number;
  studentCount: number;
  periodStart: Date;
  periodEnd: Date;
  changeAt?: Date;
}): {
  daysInPeriod: number;
  daysRemaining: number;
  prorationKrw: number;
} {
  const changeAt = input.changeAt ?? new Date();
  const start = input.periodStart.getTime();
  const end = input.periodEnd.getTime();
  const now = changeAt.getTime();

  const msDay = 24 * 60 * 60 * 1000;
  const daysInPeriod = Math.max(1, Math.ceil((end - start) / msDay));
  const daysRemaining = Math.max(
    0,
    Math.min(daysInPeriod, Math.ceil((end - now) / msDay)),
  );

  const oldMonthly = estimateMonthlyPriceKrw(
    input.studentCount,
    input.oldUnitKrw,
  );
  const newMonthly = estimateMonthlyPriceKrw(
    input.studentCount,
    input.newUnitKrw,
  );
  const prorationKrw = Math.round(
    ((newMonthly - oldMonthly) * daysRemaining) / daysInPeriod,
  );

  return { daysInPeriod, daysRemaining, prorationKrw };
}
