/**
 * 건의사항 조회 권한.
 *
 * 지금은 학원 원장(admin)이 볼 수 있습니다.
 * 나중에 원장들을 관리하는 플랫폼 메인 계정(platform_admin)이 생기면
 * 그쪽만 보게 바꾸고, 원장(admin) 접근은 막을 예정입니다.
 */
import type { UserRole } from "@/types/user";

export type SuggestionViewerRole = UserRole | "platform_admin";

export function canViewSuggestions(role: UserRole | string | undefined): boolean {
  // TODO(platform_admin): role === "platform_admin" 만 허용하도록 전환
  return role === "admin";
}

export function suggestionsAdminPath(): string {
  // TODO(platform_admin): "/platform/suggestions" 등으로 이전
  return "/admin/suggestions";
}
