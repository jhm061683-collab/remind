"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { getHomePathForRole, verifyUser } from "@/lib/auth/users";
import { clearSession, setSession } from "@/lib/auth/session";
import { isSupabaseEnabled, toAuthEmail } from "@/lib/supabase/config";
import { createServiceClient, isServiceRoleConfigured } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/user";

export type LoginState = {
  error?: string;
};

type LoginProfile = {
  name: string;
  role: UserRole;
  isDirector: boolean;
  nickname: string | null;
};

async function getProfileFromSupabase(userId: string): Promise<LoginProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, role, is_director, nickname")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return {
    name: data.display_name as string,
    role: data.role as UserRole,
    isDirector: Boolean(data.is_director) || data.role === "admin",
    nickname: (data.nickname as string | null) ?? null,
  };
}

function profileFromUserMetadata(metadata: Record<string, unknown> | undefined): LoginProfile | null {
  const role = metadata?.role;
  const name = metadata?.display_name;
  if (
    typeof role === "string" &&
    typeof name === "string" &&
    (role === "student" || role === "admin" || role === "sub_admin")
  ) {
    return {
      name,
      role,
      isDirector: role === "admin" || metadata?.is_director === true,
      nickname: typeof metadata?.nickname === "string" ? metadata.nickname : null,
    };
  }
  return null;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const startedAt = Date.now();
  const marks: Array<[string, number]> = [["start", startedAt]];
  const mark = (label: string) => marks.push([label, Date.now()]);
  const flushTiming = (status: "ok" | "error") => {
    const parts: string[] = [];
    for (let i = 1; i < marks.length; i++) {
      parts.push(`${marks[i][0]}=${marks[i][1] - marks[i - 1][1]}ms`);
    }
    console.info(
      `[loginAction][${status}] total=${Date.now() - startedAt}ms username=${String(
        formData.get("username") ?? "",
      )} ${parts.join(" ")}`,
    );
  };

  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "아이디와 비밀번호를 입력해 주세요." };
  }

  if (isSupabaseEnabled()) {
    const supabase = await createClient();
    mark("createClient");
    const trimmed = username.trim();
    let email = trimmed.includes("@") ? trimmed : toAuthEmail(trimmed);
    let cachedProfile: LoginProfile | null = null;
    let resolvedAuthEmail = false;

    if (!trimmed.includes("@") && isServiceRoleConfigured()) {
      const service = createServiceClient();
      const { data: profile } = await service
        .from("profiles")
        .select("auth_email, display_name, role, is_director, nickname")
        .eq("username", trimmed)
        .maybeSingle();
      mark("lookupLoginEmail");
      if (profile?.auth_email) {
        email = profile.auth_email;
        resolvedAuthEmail = true;
        cachedProfile = {
          name: profile.display_name as string,
          role: profile.role as UserRole,
          isDirector:
            Boolean(profile.is_director) || profile.role === "admin",
          nickname: (profile.nickname as string | null) ?? null,
        };
      }
    }

    const attempt = async (targetEmail: string) =>
      supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

    let { data, error } = await attempt(email);
    mark("signIn");

    if (error && !resolvedAuthEmail && !trimmed.includes("@") && isServiceRoleConfigured()) {
      const service = createServiceClient();
      const { data: profile } = await service
        .from("profiles")
        .select("id")
        .eq("username", trimmed)
        .maybeSingle();
      mark("lookupProfileId");
      if (profile?.id) {
        const got = await service.auth.admin.getUserById(profile.id);
        mark("lookupAuthUser");
        if (got.data.user?.email) {
          email = got.data.user.email;
          const retried = await attempt(email);
          data = retried.data;
          error = retried.error;
          mark("signInRetry");
        }
      }
    }

    if (error || !data.user) {
      flushTiming("error");
      return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
    }

    const metadataProfile = profileFromUserMetadata(data.user.user_metadata);
    const profile =
      cachedProfile ?? metadataProfile ?? (await getProfileFromSupabase(data.user.id));
    mark(
      cachedProfile
        ? "profileFromCache"
        : metadataProfile
          ? "profileFromMetadata"
          : "fetchProfile",
    );

  if (!profile) {
      flushTiming("error");
      return { error: "프로필 정보를 불러오지 못했습니다." };
    }

    const { formatStaffLabel } = await import("@/lib/admin/staff-label");
    const sessionName =
      profile.role === "admin" || profile.isDirector
        ? formatStaffLabel({
            displayName: profile.name,
            nickname: profile.nickname,
            role: profile.role,
            isDirector: profile.isDirector,
          })
        : profile.name;

    const userId = data.user.id;
    after(async () => {
      const client = await createClient();
      await client.from("login_events").insert({ user_id: userId });
    });
    mark("scheduleLoginEvent");

    await setSession({
      id: userId,
      name: sessionName,
      role: profile.role,
      isDirector: profile.isDirector || profile.role === "admin",
      staffMode: profile.role === "admin" ? "admin" : "teacher",
    });
    mark("setSession");

    flushTiming("ok");
    redirect(getHomePathForRole(profile.role));
  }

  const user = verifyUser(username, password);
  mark("verifyLocal");
  if (!user) {
    flushTiming("error");
    return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
  }

  await setSession({
    id: user.id,
    name: user.name,
    role: user.role,
    isDirector: user.role === "admin",
    staffMode: user.role === "admin" ? "admin" : "teacher",
  });
  mark("setSessionLocal");

  flushTiming("ok");
  redirect(getHomePathForRole(user.role));
}

export async function switchStaffModeAction(
  mode: "admin" | "teacher",
): Promise<{ error?: string }> {
  const { getSession, setSession } = await import("@/lib/auth/session");
  const { canSwitchStaffMode } = await import("@/lib/auth/staff-mode");
  const { revalidatePath } = await import("next/cache");

  const session = await getSession();
  if (!session) return { error: "로그인이 필요합니다." };
  if (!canSwitchStaffMode(session)) {
    return { error: "모드를 바꿀 권한이 없습니다." };
  }

  await setSession({
    ...session,
    isDirector: session.isDirector || session.role === "admin",
    staffMode: mode,
  });
  revalidatePath("/admin", "layout");
  redirect("/admin/dashboard");
}

export async function logoutAction(): Promise<void> {
  if (isSupabaseEnabled()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  await clearSession();
  redirect("/login");
}
