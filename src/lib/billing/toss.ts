/** 토스페이먼츠 환경설정 (시크릿은 서버 전용) */

export function getTossClientKey(): string | null {
  return process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim() || null;
}

export function getTossSecretKey(): string | null {
  return process.env.TOSS_SECRET_KEY?.trim() || null;
}

export function isTossBillingConfigured(): boolean {
  return Boolean(getTossClientKey() && getTossSecretKey());
}

/**
 * 사업자번호/토스 계약 전에도 화면·흐름을 시험할 수 있는 목 결제.
 * - BILLING_MOCK=1 이면 강제 목
 * - 토스 키가 없으면 자동 목
 */
export function isBillingMockMode(): boolean {
  if (process.env.BILLING_MOCK === "1") return true;
  if (process.env.BILLING_MOCK === "0") return false;
  return !isTossBillingConfigured();
}

export function tossCustomerKeyForAcademy(academyId: string): string {
  // 토스 customerKey: 영문·숫자·일부 특수문자, 충분히 무작위
  return `academy_${academyId.replace(/-/g, "")}`;
}

export function tossAuthHeader(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}
