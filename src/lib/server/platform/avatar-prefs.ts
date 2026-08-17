import {
  AVATAR_ACCESSORIES,
  AVATAR_GLASSES,
  AVATAR_HATS,
  AVATAR_PRESETS,
  animalVariantImagePath,
  formatAnimalVariantLabel,
  parseAvatarConfig,
  resolveVariantId,
  type AvatarAccessoryId,
  type AvatarGlassesId,
  type AvatarHatId,
  type AvatarPresetId,
} from "@/lib/avatars/presets";
import { createServiceClient } from "@/lib/supabase/service";

export type AvatarPrefTopItem = {
  id: string;
  label: string;
  count: number;
  pct: number;
  imageSrc: string | null;
};

export type StudentAvatarPreferenceStats = {
  /** avatar_url이 실제로 저장된 재원 학생 수 */
  sampleSize: number;
  /** animal+variant 단위 순위 (예: cat:calico → 고양이 · 삼색이) */
  animals: AvatarPrefTopItem[];
  hats: AvatarPrefTopItem[];
  glasses: AvatarPrefTopItem[];
  accessories: AvatarPrefTopItem[];
};

const HAT_IMG: Partial<Record<AvatarHatId, string>> = {
  ribbon: "/avatars/parts/part-hat-ribbon.png",
  crown: "/avatars/parts/part-hat-crown.png",
  beret: "/avatars/parts/part-hat-beret.png",
};

const GLASSES_IMG: Partial<Record<AvatarGlassesId, string>> = {
  round: "/avatars/parts/part-glasses-round.png",
  sun: "/avatars/parts/part-glasses-sun.png",
  heart: "/avatars/parts/part-glasses-heart.png",
  smart: "/avatars/parts/part-glasses-smart.png",
  hiphop: "/avatars/parts/part-glasses-hiphop.png",
};

const ACC_IMG: Partial<Record<AvatarAccessoryId, string>> = {
  bow: "/avatars/parts/part-acc-bow.png",
  blush: "/avatars/parts/part-acc-blush.png",
  bell: "/avatars/parts/part-acc-bell.png",
};

function bump(map: Map<string, number>, id: string) {
  map.set(id, (map.get(id) ?? 0) + 1);
}

/** 카테고리 전체 순위 (none 제외, 0명이어도 목록에 포함) */
function rankAll(
  map: Map<string, number>,
  allIds: readonly string[],
  labelOf: (id: string) => string,
  imageOf: (id: string) => string | null,
  denom: number,
): AvatarPrefTopItem[] {
  return allIds
    .filter((id) => id !== "none")
    .map((id) => {
      const count = map.get(id) ?? 0;
      return {
        id,
        label: labelOf(id),
        count,
        pct: denom > 0 ? Math.round((count / denom) * 1000) / 10 : 0,
        imageSrc: imageOf(id),
      };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"));
}

function animalVariantKey(animal: AvatarPresetId, variant: string): string {
  return `${animal}:${resolveVariantId(animal, variant)}`;
}

function parseAnimalVariantKey(id: string): {
  animal: AvatarPresetId;
  variant: string;
} | null {
  const [animal, variant] = id.split(":");
  if (!animal || !variant) return null;
  if (!AVATAR_PRESETS.some((p) => p.id === animal)) return null;
  return {
    animal: animal as AvatarPresetId,
    variant: resolveVariantId(animal as AvatarPresetId, variant),
  };
}

function animalVariantLabel(id: string): string {
  const parsed = parseAnimalVariantKey(id);
  if (!parsed) return id;
  return formatAnimalVariantLabel(parsed.animal, parsed.variant);
}

function animalVariantImage(id: string): string | null {
  const parsed = parseAnimalVariantKey(id);
  if (!parsed) return null;
  return animalVariantImagePath(parsed.animal, parsed.variant);
}

function allAnimalVariantIds(): string[] {
  return AVATAR_PRESETS.flatMap((p) =>
    p.variants.map((v) => animalVariantKey(p.id as AvatarPresetId, v.id)),
  );
}

function hatLabel(id: string): string {
  return AVATAR_HATS.find((h) => h.id === id)?.label ?? id;
}

function glassesLabel(id: string): string {
  return AVATAR_GLASSES.find((g) => g.id === id)?.label ?? id;
}

function accLabel(id: string): string {
  return AVATAR_ACCESSORIES.find((a) => a.id === id)?.label ?? id;
}

/**
 * 전역 재원 학생의 아바타 선호 전체 순위.
 * avatar_url이 없는 학생은 시드 기본값 왜곡을 막기 위해 제외.
 * 캐릭터는 animal+variant 단위로 집계.
 */
export async function getStudentAvatarPreferenceStats(): Promise<StudentAvatarPreferenceStats> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, avatar_url")
    .eq("role", "student")
    .is("withdrawn_at", null)
    .not("avatar_url", "is", null)
    .limit(10000);

  if (error) {
    console.error("[avatar-prefs]", error.message);
    return {
      sampleSize: 0,
      animals: [],
      hats: [],
      glasses: [],
      accessories: [],
    };
  }

  const animals = new Map<string, number>();
  const hats = new Map<string, number>();
  const glasses = new Map<string, number>();
  const accessories = new Map<string, number>();
  let sampleSize = 0;
  let hatChosen = 0;
  let glassesChosen = 0;
  let accChosen = 0;

  for (const row of data ?? []) {
    const raw = row.avatar_url as string | null;
    if (!raw) continue;
    if (
      !raw.startsWith("custom:") &&
      !raw.startsWith("preset:") &&
      !raw.startsWith("dicebear:")
    ) {
      continue;
    }

    sampleSize += 1;
    const cfg = parseAvatarConfig(raw, row.id as string);
    const animal = cfg.animal as AvatarPresetId;
    const variant = resolveVariantId(animal, cfg.variant);
    bump(animals, animalVariantKey(animal, variant));

    if (cfg.hat !== "none") {
      bump(hats, cfg.hat as AvatarHatId);
      hatChosen += 1;
    }
    if (cfg.glasses !== "none") {
      bump(glasses, cfg.glasses as AvatarGlassesId);
      glassesChosen += 1;
    }
    if (cfg.accessory !== "none") {
      bump(accessories, cfg.accessory as AvatarAccessoryId);
      accChosen += 1;
    }
  }

  return {
    sampleSize,
    animals: rankAll(
      animals,
      allAnimalVariantIds(),
      animalVariantLabel,
      animalVariantImage,
      sampleSize,
    ),
    hats: rankAll(
      hats,
      AVATAR_HATS.map((h) => h.id),
      hatLabel,
      (id) => HAT_IMG[id as AvatarHatId] ?? null,
      hatChosen,
    ),
    glasses: rankAll(
      glasses,
      AVATAR_GLASSES.map((g) => g.id),
      glassesLabel,
      (id) => GLASSES_IMG[id as AvatarGlassesId] ?? null,
      glassesChosen,
    ),
    accessories: rankAll(
      accessories,
      AVATAR_ACCESSORIES.map((a) => a.id),
      accLabel,
      (id) => ACC_IMG[id as AvatarAccessoryId] ?? null,
      accChosen,
    ),
  };
}
