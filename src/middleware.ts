import { type NextRequest, NextResponse } from "next/server";
import { getHomePathForRole } from "@/lib/auth/users";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { canAccessAdminPath } from "@/lib/constants/admin-nav";
import { isSupabaseEnabled, isSupabaseUserId } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/middleware";

const STUDENT_PREFIXES = [
  "/dashboard",
  "/subjects",
  "/study",
  "/archive",
  "/upload",
  "/records",
];
const ADMIN_PREFIXES = ["/admin"];
const LEGACY_SUB_ADMIN_PREFIXES = ["/sub-admin"];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = await updateSession(request);

  const session = parseSessionCookie(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );

  if (isSupabaseEnabled() && session) {
    const hasSupabaseAuthCookie = request.cookies
      .getAll()
      .some(
        (c) =>
          c.name.startsWith("sb-") &&
          (c.name.includes("auth-token") || c.name.includes("access-token")),
      );

    if (!hasSupabaseAuthCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("reason", "expired");
      const expiredResponse = NextResponse.redirect(loginUrl);
      expiredResponse.cookies.delete(SESSION_COOKIE_NAME);
      expiredResponse.cookies.set(SESSION_COOKIE_NAME, "", {
        path: "/",
        maxAge: 0,
      });
      return expiredResponse;
    }
  }

  if (isSupabaseEnabled() && session && !isSupabaseUserId(session.id)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("reason", "stale-session");
    const staleResponse = NextResponse.redirect(loginUrl);
    staleResponse.cookies.delete(SESSION_COOKIE_NAME);
    staleResponse.cookies.set(SESSION_COOKIE_NAME, "", {
      path: "/",
      maxAge: 0,
    });
    return staleResponse;
  }

  if (matchesPrefix(pathname, LEGACY_SUB_ADMIN_PREFIXES)) {
    const target = pathname.replace(/^\/sub-admin/, "/admin");
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(
        new URL(getHomePathForRole(session.role), request.url),
      );
    }
    return response;
  }

  const isProtected =
    matchesPrefix(pathname, STUDENT_PREFIXES) ||
    matchesPrefix(pathname, ADMIN_PREFIXES);

  if (!isProtected) {
    return response;
  }

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (matchesPrefix(pathname, ADMIN_PREFIXES)) {
    if (!canAccessAdminPath(session.role, pathname)) {
      return NextResponse.redirect(
        new URL(getHomePathForRole(session.role), request.url),
      );
    }
    return response;
  }

  if (
    matchesPrefix(pathname, STUDENT_PREFIXES) &&
    session.role !== "student"
  ) {
    return NextResponse.redirect(
      new URL(getHomePathForRole(session.role), request.url),
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/subjects/:path*",
    "/study/:path*",
    "/archive/:path*",
    "/upload/:path*",
    "/records/:path*",
    "/admin/:path*",
    "/sub-admin/:path*",
  ],
};
