import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/supabase/config";

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.startsWith("sb-") &&
        (cookie.name.includes("auth-token") ||
          cookie.name.includes("access-token")),
    );
}

export async function updateSession(request: NextRequest) {
  if (!isSupabaseEnabled()) {
    return NextResponse.next({ request });
  }

  // 비로그인 방문(랜딩·로그인 등)은 Supabase 원격 검증을 건너뛴다.
  if (!hasSupabaseAuthCookie(request)) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // getUser()는 매 요청마다 Auth 서버 왕복이 필요해 탭 전환이 느려진다.
  // getSession()은 쿠키 기반으로 토큰을 갱신하며 클라이언트 내비게이션 지연을 줄인다.
  await supabase.auth.getSession();
  return response;
}
