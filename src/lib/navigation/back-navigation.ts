export type BackNavigationInput = {
  fallbackHref: string;
  referrer: string | null;
  historyLength: number;
  origin: string;
};

/** 목록에서 같은 사이트로 왔을 때만 브라우저 뒤로가기를 쓴다. */
export function shouldNavigateBack(input: BackNavigationInput): boolean {
  if (input.historyLength <= 1) return false;
  if (!input.referrer) return false;

  try {
    const ref = new URL(input.referrer);
    if (ref.origin !== input.origin) return false;
    if (ref.pathname === "/login") return false;
    if (ref.pathname === input.fallbackHref) return true;
    // 상세·하위 경로에서 목록으로 돌아갈 때
    if (ref.pathname.startsWith("/admin/students")) return true;
    if (ref.pathname.startsWith("/archive")) return true;
    if (ref.pathname === "/dashboard") return true;
    if (ref.pathname.startsWith("/admin/dashboard")) return true;
    return ref.pathname.startsWith("/admin/");
  } catch {
    return false;
  }
}

export function resolveBackNavigation(input: BackNavigationInput): "back" | "href" {
  return shouldNavigateBack(input) ? "back" : "href";
}
