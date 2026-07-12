/** Supabase 환경 변수가 있으면 DB 모드, 없으면 localStorage 모드 */
export function isSupabaseEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Supabase auth.users id (데모 localStorage id `student-1` 과 구분) */
export function isSupabaseUserId(id: string): boolean {
  return UUID_RE.test(id);
}

export function toAuthEmail(usernameOrEmail: string): string {
  const value = usernameOrEmail.trim().toLowerCase();
  if (value.includes("@")) return value;
  return `${value}@demo.app`;
}
