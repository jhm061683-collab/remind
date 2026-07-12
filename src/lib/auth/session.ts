import { cookies } from "next/headers";
import type { UserRole } from "@/types/user";

export type SessionUser = {
  id: string;
  name: string;
  role: UserRole;
};

const SESSION_COOKIE = "wrong-note-session";

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as SessionUser;
    if (!parsed.id || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setSession(user: SessionUser): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, encodeURIComponent(JSON.stringify(user)), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function parseSessionCookie(raw: string | undefined): SessionUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as SessionUser;
    if (!parsed.id || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}
