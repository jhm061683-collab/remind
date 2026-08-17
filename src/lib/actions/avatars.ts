"use server";

import {
  isValidAvatarConfig,
  serializeAvatarConfig,
  type AvatarConfig,
  defaultAvatarConfig,
  AVATAR_PRESETS,
} from "@/lib/avatars/presets";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseUserId } from "@/lib/supabase/config";

async function uploadPublicImage(
  folder: string,
  file: File,
): Promise<string> {
  const supabase = createServiceClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${safeExt}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from("question-images")
    .upload(path, buffer, {
      contentType: file.type || `image/${safeExt}`,
      upsert: false,
    });
  if (error) throw error;
  const { data } = supabase.storage.from("question-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function setStudentAvatarConfigAction(
  input: AvatarConfig | {
    animal?: string;
    variant?: string;
    hat?: string;
    glasses?: string;
    accessory?: string;
    bg?: string;
    dicebear?: unknown;
  },
): Promise<{ error?: string; value?: string }> {
  const session = await getSession();
  if (!session || !isSupabaseUserId(session.id)) {
    return { error: "로그인이 필요합니다." };
  }

  const config: AvatarConfig =
    "animal" in input &&
    typeof input.animal === "string" &&
    AVATAR_PRESETS.some((p) => p.id === input.animal)
      ? (() => {
          const animal = input.animal as AvatarConfig["animal"];
          const preset = AVATAR_PRESETS.find((p) => p.id === animal)!;
          const rawVariant =
            "variant" in input && typeof input.variant === "string"
              ? input.variant
              : preset.variants[0]!.id;
          const variant = preset.variants.some((v) => v.id === rawVariant)
            ? rawVariant
            : preset.variants[0]!.id;
          return {
            animal,
            variant,
            hat: (input.hat as AvatarConfig["hat"]) ?? "none",
            glasses: (input.glasses as AvatarConfig["glasses"]) ?? "none",
            accessory: (input.accessory as AvatarConfig["accessory"]) ?? "none",
            bg: (input.bg as AvatarConfig["bg"]) ?? "aurora",
          };
        })()
      : defaultAvatarConfig(session.id);

  if (!isValidAvatarConfig(config)) {
    return { error: "선택할 수 없는 아바타예요." };
  }

  // DB에는 이미지 파일이 아니라 설정 문자열만 저장
  const value = serializeAvatarConfig(config);
  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: value })
      .eq("id", session.id);
    if (error) throw error;
    return { value };
  } catch (error) {
    console.error("[setStudentAvatarConfigAction]", error);
    return { error: "아바타 저장에 실패했습니다." };
  }
}

export async function setStudentAvatarPresetAction(
  presetId: string,
): Promise<{ error?: string; value?: string }> {
  const animal = AVATAR_PRESETS.find((p) => p.id === presetId)?.id;
  if (!animal) return { error: "선택할 수 없는 캐릭터예요." };
  return setStudentAvatarConfigAction({
    animal,
    variant: AVATAR_PRESETS.find((p) => p.id === animal)!.variants[0]!.id,
    hat: "none",
    glasses: "none",
    accessory: "none",
    bg: "aurora",
  });
}

export async function uploadClassImageAction(
  formData: FormData,
): Promise<{ error?: string; url?: string }> {
  const session = await getSession();
  if (
    !session ||
    (session.role !== "admin" && session.role !== "sub_admin")
  ) {
    return { error: "원장 또는 강사 권한이 필요합니다." };
  }
  const classId = String(formData.get("classId") ?? "");
  const file = formData.get("file");
  if (!classId) return { error: "반을 선택해 주세요." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "이미지를 선택해 주세요." };
  }
  if (file.size > 3 * 1024 * 1024) {
    return { error: "이미지는 3MB 이하로 올려 주세요." };
  }

  try {
    const supabase = createServiceClient();
    const { data: staff } = await supabase
      .from("profiles")
      .select("academy_id")
      .eq("id", session.id)
      .maybeSingle();
    const academyId = staff?.academy_id as string | null;
    if (!academyId) return { error: "학원 정보를 찾을 수 없습니다." };

    const { data: room } = await supabase
      .from("class_rooms")
      .select("id")
      .eq("id", classId)
      .eq("academy_id", academyId)
      .maybeSingle();
    if (!room) return { error: "반을 찾을 수 없습니다." };

    const url = await uploadPublicImage(`class-images/${classId}`, file);
    const { error } = await supabase
      .from("class_rooms")
      .update({ image_url: url })
      .eq("id", classId);
    if (error) throw error;
    return { url };
  } catch (error) {
    console.error("[uploadClassImageAction]", error);
    return { error: "반 이미지 업로드에 실패했습니다." };
  }
}
