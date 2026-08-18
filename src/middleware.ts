import { type NextRequest, NextResponse } from "next/server";
import { getHomePathForRole, getPasswordChangePath } from "@/lib/auth/users";
import { parseSessionCookie, SESSION_COOKIE_NAME, type SessionUser } from "@/lib/auth/session";
import { getAuthenticatedStaffRole } from "@/lib/auth/staff-mode";
import { canAccessAdminPath, isAdminOnlyPath } from "@/lib/constants/admin-nav";
import { isSupabaseEnabled, isSupabaseUserId } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/middleware";

const STUDENT_PREFIXES = [
  "/dashboard",
  "/subjects",
  "/study",
  "/archive",
  "/upload",
  "/records",
  "/account",
  "/suggestions",
  "/help",
  "/patch-notes",
];
const ADMIN_PREFIXES = ["/admin"];
const PLATFORM_PREFIXES = ["/platform"];
const LEGACY_SUB_ADMIN_PREFIXES = ["/sub-admin"];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isPasswordChangePath(pathname: string, session: SessionUser): boolean {
  const target = getPasswordChangePath(session.role);
  if (!target) return false;
  return pathname === target || pathname.startsWith(`${target}/`);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = await updateSession(request);

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

  if (pathname === "/") {
    // 비로그인 첫 방문 → 제품 소개(랜딩) 페이지
    if (session) {
      const passwordPath = session.mustChangePassword
        ? getPasswordChangePath(session.role)
        : null;
      return NextResponse.redirect(
        new URL(passwordPath ?? getHomePathForRole(session.role), request.url),
      );
    }
    return response;
  }

  if (pathname === "/login") {
    if (session) {
      const passwordPath = session.mustChangePassword
        ? getPasswordChangePath(session.role)
        : null;
      return NextResponse.redirect(
        new URL(passwordPath ?? getHomePathForRole(session.role), request.url),
      );
    }
    return response;
  }

  const isProtected =
    matchesPrefix(pathname, STUDENT_PREFIXES) ||
    matchesPrefix(pathname, ADMIN_PREFIXES) ||
    matchesPrefix(pathname, PLATFORM_PREFIXES);

  if (!isProtected) {
    return response;
  }

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (matchesPrefix(pathname, PLATFORM_PREFIXES)) {
    if (session.role !== "platform_admin") {
      return NextResponse.redirect(
        new URL(getHomePathForRole(session.role), request.url),
      );
    }
    return response;
  }

  if (matchesPrefix(pathname, ADMIN_PREFIXES)) {
    if (
      pathname === "/admin/permission-denied" ||
      pathname.startsWith("/admin/permission-denied/")
    ) {
      if (session.role === "admin" || session.role === "sub_admin") {
        return response;
      }
      const denied = new URL("/permission-denied", request.url);
      denied.searchParams.set("need", "staff");
      return NextResponse.redirect(denied);
    }
    if (
      session.mustChangePassword &&
      (session.role === "admin" || session.role === "sub_admin") &&
      !isPasswordChangePath(pathname, session)
    ) {
      return NextResponse.redirect(new URL("/admin/account", request.url));
    }
    if (session.role !== "admin" && session.role !== "sub_admin") {
      const denied = new URL("/permission-denied", request.url);
      denied.searchParams.set("need", "staff");
      denied.searchParams.set("from", getHomePathForRole(session.role));
      return NextResponse.redirect(denied);
    }
    const authRole = getAuthenticatedStaffRole(session);
    if (session.role === "sub_admin" && isAdminOnlyPath(pathname)) {
      const denied = new URL("/admin/permission-denied", request.url);
      denied.searchParams.set("need", "admin");
      denied.searchParams.set("from", "/admin/dashboard");
      return NextResponse.redirect(denied);
    }
    if (!canAccessAdminPath(authRole, pathname)) {
      const denied = new URL("/admin/permission-denied", request.url);
      denied.searchParams.set("need", "admin");
      return NextResponse.redirect(denied);
    }
    return response;
  }

  if (
    matchesPrefix(pathname, STUDENT_PREFIXES) &&
    session.role === "student" &&
    session.mustChangePassword &&
    pathname !== "/account" &&
    !pathname.startsWith("/account/")
  ) {
    return NextResponse.redirect(new URL("/account", request.url));
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
    "/",
    "/login",
    "/dashboard/:path*",
    "/subjects/:path*",
    "/study/:path*",
    "/archive/:path*",
    "/upload/:path*",
    "/records/:path*",
    "/account/:path*",
    "/account",
    "/suggestions/:path*",
    "/suggestions",
    "/help",
    "/help/:path*",
    "/patch-notes",
    "/patch-notes/:path*",
    "/admin/:path*",
    "/permission-denied",
    "/sub-admin/:path*",
    "/platform",
    "/platform/:path*",
  ],
};
