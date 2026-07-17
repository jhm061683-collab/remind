"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/server/platform/auth";
import {
  acceptAcademyInvite,
  createAcademyInvite,
  createAcademyRecord,
  revokeAcademyInvite,
  setAcademyStatus,
} from "@/lib/server/platform/queries";

export type PlatformActionState = {
  error?: string;
  ok?: string;
  inviteUrl?: string;
};

export type JoinActionState = {
  error?: string;
};

export async function createAcademyAction(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  await requirePlatformAdmin();

  const result = await createAcademyRecord({
    name: String(formData.get("name") ?? ""),
    code: String(formData.get("code") ?? ""),
    planCode: String(formData.get("planCode") ?? "trial"),
    pricePerStudentKrw: Number(formData.get("pricePerStudentKrw") ?? 3000),
  });

  if (result.error) return { error: result.error };

  revalidatePath("/platform");
  return { ok: "학원을 만들었습니다." };
}

export async function updateAcademyStatusAction(
  academyId: string,
  status: "active" | "suspended" | "trial",
): Promise<PlatformActionState> {
  await requirePlatformAdmin();
  const result = await setAcademyStatus(academyId, status);
  if (result.error) return { error: result.error };
  revalidatePath("/platform");
  return { ok: "상태를 바꿨습니다." };
}

export async function createInviteAction(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const session = await requirePlatformAdmin();

  const result = await createAcademyInvite({
    academyCode: String(formData.get("academyCode") ?? ""),
    academyNameHint: String(formData.get("academyNameHint") ?? ""),
    pricePerStudentKrw: Number(formData.get("pricePerStudentKrw") ?? 3000),
    trialDays: Number(formData.get("trialDays") ?? 14),
    expiresInDays: Number(formData.get("expiresInDays") ?? 14),
    createdBy: session.id,
  });

  if (result.error || !result.token) {
    return { error: result.error ?? "초대 링크를 만들지 못했습니다." };
  }

  revalidatePath("/platform");
  return {
    ok: "초대 링크를 만들었습니다. 아래 주소를 원장에게 보내 주세요.",
    inviteUrl: `/join/${result.token}`,
  };
}

export async function revokeInviteAction(
  inviteId: string,
): Promise<PlatformActionState> {
  await requirePlatformAdmin();
  const result = await revokeAcademyInvite(inviteId);
  if (result.error) return { error: result.error };
  revalidatePath("/platform");
  return { ok: "초대를 취소했습니다." };
}

export async function acceptInviteAction(
  _prev: JoinActionState,
  formData: FormData,
): Promise<JoinActionState> {
  const token = String(formData.get("token") ?? "");
  const result = await acceptAcademyInvite({
    token,
    academyName: String(formData.get("academyName") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });

  if (result.error) return { error: result.error };

  redirect(
    `/login?joined=1&code=${encodeURIComponent(result.academyCode ?? "")}&user=${encodeURIComponent(result.username ?? "")}`,
  );
}
