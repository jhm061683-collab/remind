/** 예전 관리자 평문 비밀번호 기록. Phase 1부터 읽기/쓰기를 끈다. 기존 행은 삭제하지 않는다. */
export async function upsertAdminVisiblePassword(
  userId: string,
  passwordPlain: string,
  updatedBy?: string | null,
): Promise<void> {
  void userId;
  void passwordPlain;
  void updatedBy;
}

export async function getAdminVisiblePassword(
  userId: string,
): Promise<string | null> {
  void userId;
  return null;
}

export async function getAdminVisiblePasswords(
  userIds: string[],
): Promise<Map<string, string>> {
  void userIds;
  return new Map();
}
