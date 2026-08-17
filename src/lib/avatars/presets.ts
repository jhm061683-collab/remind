/** 3D 클레이 아바타 설정. DB에는 설정 문자열만 저장 (이미지 0원). */

export const AVATAR_PRESET_PREFIX = "preset:" as const;
export const AVATAR_CUSTOM_PREFIX = "custom:" as const;
export const DICEBEAR_PREFIX = "dicebear:" as const;

export type AvatarVariantDef = { id: string; label: string };

export const AVATAR_PRESETS = [
  {
    id: "fox",
    label: "여우",
    bg: "#FFE8D6",
    base: "#F08A3A",
    light: "#FFB06B",
    dark: "#C96520",
    muzzle: "#FFE6D2",
    variants: [
      { id: "orange", label: "오렌지" },
      { id: "arctic", label: "흰여우" },
      { id: "silver", label: "실버" },
    ],
  },
  {
    id: "cat",
    label: "고양이",
    bg: "#F3E8FF",
    base: "#F5F0EB",
    light: "#FFFFFF",
    dark: "#3A3A3A",
    muzzle: "#FFFFFF",
    variants: [
      { id: "calico", label: "삼색이" },
      { id: "black", label: "검정" },
      { id: "tuxedo", label: "턱시도" },
    ],
  },
  {
    id: "puppy",
    label: "강아지",
    bg: "#FFF0DB",
    base: "#D4A06A",
    light: "#E8C49A",
    dark: "#B07A45",
    muzzle: "#FFF4E8",
    variants: [
      { id: "golden", label: "골든" },
      { id: "shiba", label: "시바" },
      { id: "husky", label: "허스키" },
    ],
  },
  {
    id: "bunny",
    label: "토끼",
    bg: "#FFE8F0",
    base: "#F0A0B8",
    light: "#FFC4D4",
    dark: "#D47894",
    muzzle: "#FFE8F0",
    variants: [
      { id: "white", label: "흰토끼" },
      { id: "brown", label: "갈색" },
      { id: "gray", label: "회색" },
    ],
  },
  {
    id: "bear",
    label: "곰",
    bg: "#EFE6DC",
    base: "#A67C52",
    light: "#C9A07A",
    dark: "#7A5736",
    muzzle: "#F3E4D4",
    variants: [
      { id: "brown", label: "갈색" },
      { id: "polar", label: "북극곰" },
      { id: "cream", label: "크림" },
    ],
  },
  {
    id: "panda",
    label: "판다",
    bg: "#F0F4F8",
    base: "#F7FBFE",
    light: "#FFFFFF",
    dark: "#D8E0E8",
    muzzle: "#FFFFFF",
    variants: [
      { id: "classic", label: "클래식" },
      { id: "baby", label: "베이비" },
      { id: "red", label: "레드톤" },
    ],
  },
  {
    id: "chick",
    label: "병아리",
    bg: "#FFF8DC",
    base: "#F5C842",
    light: "#FFE27A",
    dark: "#D4A820",
    muzzle: "#FFE9A0",
    variants: [
      { id: "yellow", label: "노랑" },
      { id: "brown", label: "갈색" },
      { id: "fluffy", label: "솜털흰" },
    ],
  },
  {
    id: "penguin",
    label: "펭귄",
    bg: "#E8F4FC",
    base: "#3D4F63",
    light: "#5A6F86",
    dark: "#243140",
    muzzle: "#F7FBFE",
    variants: [
      { id: "classic", label: "클래식" },
      { id: "emperor", label: "황제" },
      { id: "chick", label: "새끼" },
    ],
  },
  {
    id: "otter",
    label: "수달",
    bg: "#E8F5E9",
    base: "#7BA07A",
    light: "#A3C4A2",
    dark: "#567556",
    muzzle: "#E4F2E6",
    variants: [
      { id: "brown", label: "갈색" },
      { id: "light", label: "연한" },
      { id: "belly", label: "흰배" },
    ],
  },
  {
    id: "raccoon",
    label: "너구리",
    bg: "#F5F0EB",
    base: "#8B7B6E",
    light: "#B0A094",
    dark: "#5F5248",
    muzzle: "#FFF3E4",
    variants: [
      { id: "classic", label: "클래식" },
      { id: "light", label: "밝은" },
      { id: "dark", label: "다크" },
    ],
  },
  {
    id: "pig",
    label: "돼지",
    bg: "#FFE4EC",
    base: "#F5A8B8",
    light: "#FFC4D0",
    dark: "#E07890",
    muzzle: "#FFD6E0",
    variants: [
      { id: "pink", label: "분홍" },
      { id: "spotted", label: "점박이" },
      { id: "blackear", label: "검정귀" },
    ],
  },
  {
    id: "hamster",
    label: "햄스터",
    bg: "#FFF0DB",
    base: "#D4A06A",
    light: "#E8C49A",
    dark: "#B07A45",
    muzzle: "#FFF4E8",
    variants: [
      { id: "golden", label: "골든" },
      { id: "white", label: "화이트" },
      { id: "gray", label: "그레이" },
    ],
  },
] as const;

export type AvatarPresetId = (typeof AVATAR_PRESETS)[number]["id"];

export const AVATAR_HATS = [
  { id: "none", label: "모자 없음" },
  { id: "ribbon", label: "미니 레드 리본" },
  { id: "crown", label: "왕관" },
  { id: "beret", label: "미니 베레모" },
] as const;

export const AVATAR_GLASSES = [
  { id: "none", label: "안경 없음" },
  { id: "sun", label: "선글라스" },
  { id: "round", label: "동그란 안경" },
  { id: "heart", label: "하트 선글라스" },
  { id: "smart", label: "스마트 안경" },
  { id: "hiphop", label: "힙합 선글라스" },
] as const;

export const AVATAR_ACCESSORIES = [
  { id: "none", label: "악세사리 없음" },
  { id: "bow", label: "나비넥타이" },
  { id: "blush", label: "볼터치" },
  { id: "bell", label: "미니 방울" },
] as const;

export const AVATAR_BACKGROUNDS = [
  {
    id: "pink",
    label: "소프트 핑크",
    swatch: "#FFD6E8",
    css: "linear-gradient(160deg,#FFE8F2,#FFD0E4)",
  },
  {
    id: "sky",
    label: "스카이 블루",
    swatch: "#CCE8FF",
    css: "linear-gradient(160deg,#E4F3FF,#B8DCFF)",
  },
  {
    id: "jelly",
    label: "젤리 옐로우",
    swatch: "#FFF3B0",
    css: "linear-gradient(160deg,#FFF8D6,#FFE68A)",
  },
  {
    id: "bubble",
    label: "버블 퍼플",
    swatch: "#E8D9FF",
    css: "linear-gradient(160deg,#F3EBFF,#D4C0FF)",
  },
  {
    id: "mint",
    label: "민트 그린",
    swatch: "#D8F5D3",
    css: "linear-gradient(160deg,#E8FBE4,#B8EFC0)",
  },
  {
    id: "aurora",
    label: "오로라",
    swatch: "#C8F0FF",
    css: "linear-gradient(135deg,#FFD6E8 0%,#CCE8FF 40%,#E8D9FF 70%,#FFF3B0 100%)",
  },
] as const;

export type AvatarHatId = (typeof AVATAR_HATS)[number]["id"];
export type AvatarGlassesId = (typeof AVATAR_GLASSES)[number]["id"];
export type AvatarAccessoryId = (typeof AVATAR_ACCESSORIES)[number]["id"];
export type AvatarBgId = (typeof AVATAR_BACKGROUNDS)[number]["id"];

export type AvatarConfig = {
  animal: AvatarPresetId;
  variant: string;
  hat: AvatarHatId;
  glasses: AvatarGlassesId;
  accessory: AvatarAccessoryId;
  bg: AvatarBgId;
};

export function getAvatarPresetById(animal: AvatarPresetId) {
  return AVATAR_PRESETS.find((p) => p.id === animal)!;
}

export function defaultVariantId(animal: AvatarPresetId): string {
  return getAvatarPresetById(animal).variants[0]!.id;
}

export function resolveVariantId(
  animal: AvatarPresetId,
  variant: string | null | undefined,
): string {
  const preset = getAvatarPresetById(animal);
  if (variant && preset.variants.some((v) => v.id === variant)) return variant;
  return preset.variants[0]!.id;
}

export function getVariantLabel(
  animal: AvatarPresetId,
  variant: string,
): string {
  const v = getAvatarPresetById(animal).variants.find((x) => x.id === variant);
  return v?.label ?? variant;
}

export function formatAnimalVariantLabel(
  animal: AvatarPresetId,
  variant: string,
): string {
  const preset = getAvatarPresetById(animal);
  const vLabel = getVariantLabel(animal, variant);
  return `${preset.label} · ${vLabel}`;
}

/** public/avatars/animals/{animal}-{variant}.png */
export function animalVariantImagePath(
  animal: AvatarPresetId,
  variant: string,
): string {
  const v = resolveVariantId(animal, variant);
  return `/avatars/animals/${animal}-${v}.png`;
}

/** 구버전 파츠 id → 신버전 */
const HAT_ALIASES: Record<string, AvatarHatId> = {
  none: "none",
  ribbon: "ribbon",
  crown: "crown",
  beret: "beret",
  headband: "ribbon",
  sprout: "beret",
  party: "beret",
  cap: "beret",
  ballcap: "beret",
  beanie: "beret",
  baseball: "beret",
  earpin: "ribbon",
  wizard: "beret",
  hairpin: "ribbon",
};

const GLASSES_ALIASES: Record<string, AvatarGlassesId> = {
  none: "none",
  round: "round",
  sun: "sun",
  smart: "smart",
  heart: "heart",
  hiphop: "hiphop",
  variant01: "round",
  variant02: "smart",
  variant03: "sun",
  variant04: "heart",
};

const ACC_ALIASES: Record<string, AvatarAccessoryId> = {
  none: "none",
  bow: "bow",
  blush: "blush",
  bell: "bell",
  hoodie: "bow",
  sailor: "bow",
  muffler: "bell",
  boba: "bow",
  camera: "bow",
  earbud: "bell",
  pendant: "bell",
  flower: "bow",
  badge: "bell",
  scarf: "bell",
  star: "bell",
  heart: "bow",
  strap: "bell",
  suspenders: "bow",
};

const BG_ALIASES: Record<string, AvatarBgId> = {
  auto: "pink",
  pink: "pink",
  sky: "sky",
  jelly: "jelly",
  bubble: "bubble",
  mint: "mint",
  aurora: "aurora",
  ffd6e8: "pink",
  cce8ff: "sky",
  fff3b0: "jelly",
  d8f5d3: "mint",
  e8d9ff: "bubble",
  ffe0c2: "jelly",
};

function isHat(id: string): id is AvatarHatId {
  return AVATAR_HATS.some((h) => h.id === id);
}
function isGlasses(id: string): id is AvatarGlassesId {
  return AVATAR_GLASSES.some((g) => g.id === id);
}
function isAccessory(id: string): id is AvatarAccessoryId {
  return AVATAR_ACCESSORIES.some((a) => a.id === id);
}
function isBg(id: string): id is AvatarBgId {
  return AVATAR_BACKGROUNDS.some((b) => b.id === id);
}

export function defaultAvatarPresetId(seed: string): AvatarPresetId {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PRESETS[hash % AVATAR_PRESETS.length]!.id;
}

export function defaultAvatarConfig(seed: string): AvatarConfig {
  const animal = defaultAvatarPresetId(seed);
  return {
    animal,
    variant: defaultVariantId(animal),
    hat: "none",
    glasses: "none",
    accessory: "none",
    bg: "aurora",
  };
}

export function toAvatarPresetValue(id: AvatarPresetId): string {
  return `${AVATAR_PRESET_PREFIX}${id}`;
}

export function serializeAvatarConfig(config: AvatarConfig): string {
  const variant = resolveVariantId(config.animal, config.variant);
  return `${AVATAR_CUSTOM_PREFIX}${config.animal}|var:${variant}|hat:${config.hat}|glasses:${config.glasses}|acc:${config.accessory}|bg:${config.bg}`;
}

export function parseAvatarConfig(
  value: string | null | undefined,
  seed = "student",
): AvatarConfig {
  const fallback = defaultAvatarConfig(seed);
  if (!value) return fallback;

  if (value.startsWith(AVATAR_CUSTOM_PREFIX)) {
    const body = value.slice(AVATAR_CUSTOM_PREFIX.length);
    const [animalRaw, ...rest] = body.split("|");
    const animal =
      AVATAR_PRESETS.find((p) => p.id === animalRaw)?.id ?? fallback.animal;
    let variant: string | undefined;
    let hat: AvatarHatId = "none";
    let glasses: AvatarGlassesId = "none";
    let accessory: AvatarAccessoryId = "none";
    let bg: AvatarBgId = "aurora";
    for (const part of rest) {
      const [k, v] = part.split(":");
      if (k === "var" && v) variant = v;
      if (k === "hat" && v) hat = HAT_ALIASES[v] ?? (isHat(v) ? v : "none");
      if (k === "glasses" && v)
        glasses = GLASSES_ALIASES[v] ?? (isGlasses(v) ? v : "none");
      if (k === "acc" && v)
        accessory = ACC_ALIASES[v] ?? (isAccessory(v) ? v : "none");
      if (k === "bg" && v) bg = BG_ALIASES[v] ?? (isBg(v) ? v : "aurora");
    }
    return {
      animal,
      variant: resolveVariantId(animal, variant),
      hat,
      glasses,
      accessory,
      bg,
    };
  }

  if (value.startsWith(DICEBEAR_PREFIX)) {
    const params = new URLSearchParams(value.slice(DICEBEAR_PREFIX.length));
    const seedRaw = params.get("seed") ?? "";
    const animal =
      AVATAR_PRESETS.find((p) => p.id === seedRaw)?.id ?? fallback.animal;
    const glassesRaw = params.get("glasses") ?? "none";
    const glasses = GLASSES_ALIASES[glassesRaw] ?? "none";
    const bgRaw = params.get("backgroundColor") ?? "aurora";
    const bg = BG_ALIASES[bgRaw] ?? "aurora";
    return {
      animal,
      variant: defaultVariantId(animal),
      hat: "none",
      glasses,
      accessory: "none",
      bg,
    };
  }

  const preset = parseAvatarPresetId(value);
  if (preset)
    return {
      ...fallback,
      animal: preset,
      variant: defaultVariantId(preset),
    };
  return fallback;
}

export function parseAvatarPresetId(
  value: string | null | undefined,
): AvatarPresetId | null {
  if (!value) return null;
  if (
    value.startsWith(AVATAR_CUSTOM_PREFIX) ||
    value.startsWith(DICEBEAR_PREFIX)
  ) {
    return parseAvatarConfig(value).animal;
  }
  const raw = value.startsWith(AVATAR_PRESET_PREFIX)
    ? value.slice(AVATAR_PRESET_PREFIX.length)
    : value;
  const found = AVATAR_PRESETS.find((p) => p.id === raw);
  return found ? found.id : null;
}

export function getAvatarPreset(
  value: string | null | undefined,
): (typeof AVATAR_PRESETS)[number] | null {
  const id = parseAvatarConfig(value).animal;
  return AVATAR_PRESETS.find((p) => p.id === id) ?? null;
}

export function resolveAvatarBackgroundCss(config: AvatarConfig): string {
  const found = AVATAR_BACKGROUNDS.find((b) => b.id === config.bg);
  if (found) return found.css;
  const preset = AVATAR_PRESETS.find((p) => p.id === config.animal);
  return preset?.bg ?? "#FFE8D6";
}

/** @deprecated 단색 swatch — resolveAvatarBackgroundCss 사용 권장 */
export function resolveAvatarBackground(config: AvatarConfig): string {
  const found = AVATAR_BACKGROUNDS.find((b) => b.id === config.bg);
  if (found) return found.swatch;
  return (
    AVATAR_PRESETS.find((p) => p.id === config.animal)?.bg ?? "#FFE8D6"
  );
}

export function isHttpAvatarUrl(value: string | null | undefined): boolean {
  return Boolean(value && /^https?:\/\//i.test(value));
}

export function isValidAvatarConfig(config: AvatarConfig): boolean {
  const preset = AVATAR_PRESETS.find((p) => p.id === config.animal);
  return (
    Boolean(preset) &&
    preset!.variants.some((v) => v.id === config.variant) &&
    isHat(config.hat) &&
    isGlasses(config.glasses) &&
    isAccessory(config.accessory) &&
    isBg(config.bg)
  );
}
