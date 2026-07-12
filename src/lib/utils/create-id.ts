/** HTTP(비보안) 환경에서도 동작하는 ID 생성 */
export function createId(prefix = "id"): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    try {
      return crypto.randomUUID();
    } catch {
      // secure context가 아니면 randomUUID가 실패할 수 있음
    }
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
