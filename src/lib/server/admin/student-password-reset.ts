export type PasswordResetDecision = "ok" | "forbidden" | "not_student";

export type PasswordResetAccessInput = {
  actorRole: string;
  actorAcademyId: string | null;
  studentRole: string;
  studentAcademyId: string | null;
  studentWithdrawn: boolean;
  isAssigned: boolean;
};

/** 인증 역할 기준. 화면 보기 모드와 분리한다. */
export function decideStudentPasswordResetAccess(
  input: PasswordResetAccessInput,
): PasswordResetDecision {
  if (input.studentRole !== "student" || input.studentWithdrawn) {
    return "not_student";
  }
  if (!input.actorAcademyId || !input.studentAcademyId) return "forbidden";
  if (input.actorAcademyId !== input.studentAcademyId) return "forbidden";

  if (input.actorRole === "admin") return "ok";
  if (input.actorRole === "sub_admin") {
    return input.isAssigned ? "ok" : "forbidden";
  }
  return "forbidden";
}

const TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
export const TEMP_PASSWORD_TTL_HOURS = 24;

export function generateTemporaryPassword(length = 10): string {
  const size = Math.max(8, Math.min(16, length));
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  let result = "";
  for (const byte of bytes) {
    result += TEMP_PASSWORD_ALPHABET[byte % TEMP_PASSWORD_ALPHABET.length];
  }
  return result;
}

export function temporaryPasswordExpiresAt(now = new Date()): string {
  return new Date(
    now.getTime() + TEMP_PASSWORD_TTL_HOURS * 60 * 60 * 1000,
  ).toISOString();
}

export function isTemporaryPasswordExpired(
  expiresAt: unknown,
  now = new Date(),
): boolean {
  if (typeof expiresAt !== "string" || expiresAt.trim() === "") return false;
  const parsed = Date.parse(expiresAt);
  if (Number.isNaN(parsed)) return false;
  return parsed <= now.getTime();
}

export function temporaryPasswordMetadata(
  existing: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...existing,
    must_change_password: true,
    must_change_password_expires_at: temporaryPasswordExpiresAt(),
  };
}

export function clearedTemporaryPasswordMetadata(
  existing: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...existing,
    must_change_password: false,
    must_change_password_expires_at: null,
  };
}

/** 임시 비밀번호가 만료돼 로그인을 막아야 하면 true. 만료 시각이 없으면 통과(기존 재설정 계정). */
export function isTemporaryPasswordLoginBlocked(
  metadata: Record<string, unknown> | undefined,
  now = new Date(),
): boolean {
  if (metadata?.must_change_password !== true) return false;
  return isTemporaryPasswordExpired(
    metadata.must_change_password_expires_at,
    now,
  );
}
