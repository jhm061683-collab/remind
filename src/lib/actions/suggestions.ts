"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { canViewSuggestions } from "@/lib/constants/suggestions";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  isSupabaseEnabled,
  isSupabaseUserId,
} from "@/lib/supabase/config";
import type { StoredSuggestion } from "@/lib/types/suggestions";

export type SubmitSuggestionState = {
  error?: string;
  success?: string;
};

export async function submitSuggestionAction(
  _prev: SubmitSuggestionState,
  formData: FormData,
): Promise<SubmitSuggestionState> {
  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 2) {
    return { error: "건의 내용을 조금 더 적어 주세요." };
  }
  if (body.length > 2000) {
    return { error: "건의는 2000자 이내로 적어 주세요." };
  }

  const session = await getSession();
  if (!session) {
    return { error: "로그인이 필요합니다." };
  }

  if (!isSupabaseEnabled() || !isSupabaseUserId(session.id)) {
    return { error: "LOCAL_FALLBACK", success: undefined };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", session.id)
    .maybeSingle();

  const { error } = await supabase.from("suggestions").insert({
    user_id: session.id,
    academy_id: profile?.academy_id ?? null,
    body,
  });

  if (error) {
    console.error("[submitSuggestionAction]", error);
    if (
      error.message?.includes("suggestions") ||
      error.code === "42P01" ||
      error.code === "PGRST205"
    ) {
      return {
        error:
          "건의사항 테이블이 아직 없어요. Supabase에서 012_suggestions.sql을 실행해 주세요.",
      };
    }
    return { error: "저장에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/suggestions");
  revalidatePath("/admin/suggestions");
  return { success: "건의를 보냈어요. 감사합니다!" };
}

export async function listSuggestionsForAdminAction(): Promise<{
  error?: string;
  items?: StoredSuggestion[];
}> {
  const session = await getSession();
  if (!session || !canViewSuggestions(session.role)) {
    return { error: "권한이 없습니다." };
  }

  if (!isSupabaseEnabled()) {
    return { items: [] };
  }

  try {
    // 지금은 원장(admin) 조회. 추후 platform_admin 전용으로 이전.
    const service = createServiceClient();
    let query = service
      .from("suggestions")
      .select("id, user_id, academy_id, body, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    const supabase = await createClient();
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("academy_id")
      .eq("id", session.id)
      .maybeSingle();

    if (adminProfile?.academy_id) {
      query = query.eq("academy_id", adminProfile.academy_id);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[listSuggestionsForAdminAction]", error);
      return {
        error:
          error.message?.includes("suggestions") ||
          error.code === "42P01" ||
          error.code === "PGRST205"
            ? "건의사항 테이블이 없습니다. 012_suggestions.sql을 실행해 주세요."
            : "목록을 불러오지 못했어요.",
      };
    }

    const rows = data ?? [];
    const userIds = [...new Set(rows.map((r) => r.user_id as string))];
    const nameById = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await service
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);
      for (const p of profiles ?? []) {
        nameById.set(p.id as string, (p.display_name as string) || "학생");
      }
    }

    const items: StoredSuggestion[] = rows.map((row) => ({
      id: row.id as string,
      userId: row.user_id as string,
      userName: nameById.get(row.user_id as string) ?? "학생",
      academyId: (row.academy_id as string | null) ?? undefined,
      body: row.body as string,
      createdAt: row.created_at as string,
    }));

    return { items };
  } catch (err) {
    console.error("[listSuggestionsForAdminAction]", err);
    return { error: "목록을 불러오지 못했어요." };
  }
}
