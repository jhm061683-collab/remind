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
  return `${Math.max(0, Math.floor(amount)).toLocaleString("ko-KR")}원`;
}

export function normalizeAcademyCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}
