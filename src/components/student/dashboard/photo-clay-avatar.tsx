"use client";

import type { CSSProperties } from "react";
import {
  animalVariantImagePath,
  defaultVariantId,
  resolveVariantId,
  type AvatarAccessoryId,
  type AvatarGlassesId,
  type AvatarHatId,
  type AvatarPresetId,
} from "@/lib/avatars/presets";

const CACHE = "v=34";

/** public/avatars/animals/{animal}-{variant}.png */
export function animalImageSrc(
  animal: AvatarPresetId,
  variant?: string,
): string {
  const v = resolveVariantId(animal, variant ?? defaultVariantId(animal));
  return `${animalVariantImagePath(animal, v)}?${CACHE}`;
}

export const HAT_SRC: Partial<Record<AvatarHatId, string>> = {
  ribbon: "/avatars/parts/part-hat-ribbon.png",
  crown: "/avatars/parts/part-hat-crown.png",
  beret: "/avatars/parts/part-hat-beret.png",
};

export const GLASSES_SRC: Partial<Record<AvatarGlassesId, string>> = {
  round: "/avatars/parts/part-glasses-round.png",
  sun: "/avatars/parts/part-glasses-sun.png",
  heart: "/avatars/parts/part-glasses-heart.png",
  smart: "/avatars/parts/part-glasses-smart.png",
  hiphop: "/avatars/parts/part-glasses-hiphop.png",
};

export const ACC_SRC: Partial<Record<AvatarAccessoryId, string>> = {
  bow: "/avatars/parts/part-acc-bow.png",
  blush: "/avatars/parts/part-acc-blush.png",
  bell: "/avatars/parts/part-acc-bell.png",
};

type Anchor = {
  top: number;
  left: number;
  scale: number;
  /** 동공 간격(%) — glasses 전용 */
  ipd?: number;
};

export type AnimalPartOffsets = {
  hat: Anchor;
  glasses: Anchor;
  accessory: Anchor;
};

/** 동물 패밀리 기본 좌표 (품종별 미측정 시 폴백) */
const FAMILY_OFFSETS: Record<AvatarPresetId, AnimalPartOffsets> = {
  fox: {
    hat: { top: 33, left: 50, scale: 1.12 },
    glasses: { top: 66.0, left: 50, scale: 1, ipd: 29.0 },
    accessory: { top: 86, left: 50, scale: 0.96 },
  },
  cat: {
    hat: { top: 28, left: 50, scale: 1.12 },
    glasses: { top: 58.8, left: 50, scale: 1, ipd: 29.0 },
    accessory: { top: 87, left: 50, scale: 0.96 },
  },
  puppy: {
    hat: { top: 29, left: 50, scale: 1.14 },
    glasses: { top: 63.0, left: 50, scale: 1, ipd: 30.0 },
    accessory: { top: 86, left: 50, scale: 0.96 },
  },
  bunny: {
    hat: { top: 43, left: 50, scale: 1.08 },
    glasses: { top: 68.5, left: 50, scale: 1, ipd: 28.5 },
    accessory: { top: 87, left: 50, scale: 0.9 },
  },
  bear: {
    hat: { top: 27, left: 50, scale: 1.15 },
    glasses: { top: 62.0, left: 50, scale: 1, ipd: 31.5 },
    accessory: { top: 87, left: 50, scale: 0.96 },
  },
  panda: {
    hat: { top: 28, left: 50, scale: 1.15 },
    glasses: { top: 59.2, left: 50, scale: 1, ipd: 33.5 },
    accessory: { top: 87, left: 50, scale: 0.96 },
  },
  chick: {
    hat: { top: 31, left: 50, scale: 1.08 },
    glasses: { top: 65.0, left: 50, scale: 1, ipd: 29.5 },
    accessory: { top: 89, left: 50, scale: 0.85 },
  },
  penguin: {
    hat: { top: 29, left: 50, scale: 1.1 },
    glasses: { top: 65.5, left: 50, scale: 1, ipd: 31.5 },
    accessory: { top: 87, left: 50, scale: 0.9 },
  },
  otter: {
    hat: { top: 30, left: 50, scale: 1.14 },
    glasses: { top: 63.0, left: 50, scale: 1, ipd: 31.5 },
    accessory: { top: 86, left: 50, scale: 0.96 },
  },
  raccoon: {
    hat: { top: 28, left: 50, scale: 1.14 },
    glasses: { top: 63.5, left: 50, scale: 1, ipd: 30.5 },
    accessory: { top: 87, left: 50, scale: 0.96 },
  },
  pig: {
    hat: { top: 27, left: 50, scale: 1.12 },
    glasses: { top: 50.5, left: 50, scale: 1, ipd: 32.5 },
    accessory: { top: 87, left: 50, scale: 0.94 },
  },
  hamster: {
    hat: { top: 29, left: 50, scale: 1.1 },
    glasses: { top: 51.0, left: 50, scale: 1, ipd: 30.0 },
    accessory: { top: 87, left: 50, scale: 0.94 },
  },
};

/** 품종별 좌표 (동공 실측 + 기본 품종 바이어스 보정) */
export const VARIANT_OFFSETS: Partial<
  Record<AvatarPresetId, Partial<Record<string, AnimalPartOffsets>>>
> = {
  fox: {
    orange: FAMILY_OFFSETS.fox,
    arctic: {
      hat: { top: 27.3, left: 50, scale: 1.12 },
      glasses: { top: 55.6, left: 50, scale: 1, ipd: 30.4 },
      accessory: { top: 84.8, left: 50, scale: 0.96 },
    },
    silver: {
      hat: { top: 30.8, left: 50, scale: 1.12 },
      glasses: { top: 62, left: 50, scale: 1, ipd: 30.5 },
      accessory: { top: 85.5, left: 50, scale: 0.96 },
    },
  },
  cat: {
    calico: FAMILY_OFFSETS.cat,
    black: {
      hat: { top: 25.6, left: 50, scale: 1.12 },
      glasses: { top: 54.5, left: 50, scale: 1, ipd: 31.5 },
      accessory: { top: 86.5, left: 50, scale: 0.96 },
    },
    tuxedo: {
      hat: { top: 24.3, left: 50, scale: 1.12 },
      glasses: { top: 52, left: 50, scale: 1, ipd: 30 },
      accessory: { top: 86.2, left: 50, scale: 0.96 },
    },
  },
  puppy: {
    golden: FAMILY_OFFSETS.puppy,
    shiba: {
      hat: { top: 23.4, left: 50, scale: 1.14 },
      glasses: { top: 52.9, left: 50, scale: 1, ipd: 32.5 },
      accessory: { top: 84.8, left: 50, scale: 0.96 },
    },
    husky: {
      hat: { top: 25.4, left: 50, scale: 1.14 },
      glasses: { top: 56.4, left: 50, scale: 1, ipd: 29.6 },
      accessory: { top: 85.2, left: 50, scale: 0.96 },
    },
  },
  bunny: {
    white: FAMILY_OFFSETS.bunny,
    brown: {
      hat: { top: 42, left: 50, scale: 1.08 },
      glasses: { top: 66.7, left: 50, scale: 1, ipd: 30 },
      accessory: { top: 86.8, left: 50, scale: 0.9 },
    },
    gray: {
      hat: { top: 41.8, left: 50, scale: 1.08 },
      glasses: { top: 66.3, left: 50, scale: 1, ipd: 31.5 },
      accessory: { top: 86.7, left: 50, scale: 0.9 },
    },
  },
  bear: {
    brown: FAMILY_OFFSETS.bear,
    polar: {
      hat: { top: 23.2, left: 50, scale: 1.15 },
      glasses: { top: 55, left: 50, scale: 1, ipd: 31 },
      accessory: { top: 86.2, left: 50, scale: 0.96 },
    },
    cream: {
      hat: { top: 24.3, left: 50, scale: 1.15 },
      glasses: { top: 57.1, left: 50, scale: 1, ipd: 33.5 },
      accessory: { top: 86.4, left: 50, scale: 0.96 },
    },
  },
  panda: {
    classic: FAMILY_OFFSETS.panda,
    baby: {
      hat: { top: 24.4, left: 50, scale: 1.15 },
      glasses: { top: 52.6, left: 50, scale: 1, ipd: 34.5 },
      accessory: { top: 86.2, left: 50, scale: 0.96 },
    },
    red: {
      hat: { top: 25.3, left: 50, scale: 1.15 },
      glasses: { top: 54.2, left: 50, scale: 1, ipd: 34.5 },
      accessory: { top: 86.4, left: 50, scale: 0.96 },
    },
  },
  chick: {
    yellow: FAMILY_OFFSETS.chick,
    brown: {
      hat: { top: 25, left: 50, scale: 1.08 },
      glasses: { top: 54, left: 50, scale: 1, ipd: 30 },
      accessory: { top: 87.7, left: 50, scale: 0.85 },
    },
    fluffy: {
      hat: { top: 25.3, left: 50, scale: 1.08 },
      glasses: { top: 54.6, left: 50, scale: 1, ipd: 31.5 },
      accessory: { top: 87.8, left: 50, scale: 0.85 },
    },
  },
  penguin: {
    classic: FAMILY_OFFSETS.penguin,
    emperor: {
      hat: { top: 21.6, left: 50, scale: 1.1 },
      glasses: { top: 52, left: 50, scale: 1, ipd: 30.5 },
      accessory: { top: 85.4, left: 50, scale: 0.9 },
    },
    chick: {
      hat: { top: 22.8, left: 50, scale: 1.1 },
      glasses: { top: 54.2, left: 50, scale: 1, ipd: 32.7 },
      accessory: { top: 85.6, left: 50, scale: 0.9 },
    },
  },
  otter: {
    brown: FAMILY_OFFSETS.otter,
    light: {
      hat: { top: 26.2, left: 50, scale: 1.14 },
      glasses: { top: 56, left: 50, scale: 1, ipd: 31 },
      accessory: { top: 85.2, left: 50, scale: 0.96 },
    },
    belly: {
      hat: { top: 24.2, left: 50, scale: 1.14 },
      glasses: { top: 52.5, left: 50, scale: 1, ipd: 30.5 },
      accessory: { top: 84.7, left: 50, scale: 0.96 },
    },
  },
  raccoon: {
    classic: FAMILY_OFFSETS.raccoon,
    light: {
      hat: { top: 26, left: 50, scale: 1.14 },
      glasses: { top: 59.9, left: 50, scale: 1, ipd: 32.6 },
      accessory: { top: 86.6, left: 50, scale: 0.96 },
    },
    dark: {
      hat: { top: 24.9, left: 50, scale: 1.14 },
      glasses: { top: 57.9, left: 50, scale: 1, ipd: 33.5 },
      accessory: { top: 86.3, left: 50, scale: 0.96 },
    },
  },
  pig: {
    pink: FAMILY_OFFSETS.pig,
    spotted: {
      hat: { top: 28.6, left: 50, scale: 1.12 },
      glasses: { top: 53.4, left: 50, scale: 1, ipd: 32.8 },
      accessory: { top: 87.3, left: 50, scale: 0.94 },
    },
    blackear: {
      hat: { top: 29.9, left: 50, scale: 1.12 },
      glasses: { top: 55.7, left: 50, scale: 1, ipd: 32.4 },
      accessory: { top: 87.6, left: 50, scale: 0.94 },
    },
  },
  hamster: {
    golden: FAMILY_OFFSETS.hamster,
    white: {
      hat: { top: 29.2, left: 50, scale: 1.1 },
      glasses: { top: 51.3, left: 50, scale: 1, ipd: 31.1 },
      accessory: { top: 87, left: 50, scale: 0.94 },
    },
    gray: {
      hat: { top: 28, left: 50, scale: 1.1 },
      glasses: { top: 49.2, left: 50, scale: 1, ipd: 29.8 },
      accessory: { top: 86.8, left: 50, scale: 0.94 },
    },
  },
};

export function resolveAnimalOffsets(
  animal: AvatarPresetId,
  variant?: string,
): AnimalPartOffsets {
  const v = resolveVariantId(animal, variant ?? defaultVariantId(animal));
  return VARIANT_OFFSETS[animal]?.[v] ?? FAMILY_OFFSETS[animal];
}

/** @deprecated — resolveAnimalOffsets 사용 */
export const ANIMAL_OFFSETS = FAMILY_OFFSETS;

const HAT_TUNE: Record<
  Exclude<AvatarHatId, "none">,
  { width: number; dy: number; scale: number; anchorY: number }
> = {
  ribbon: { width: 44, dy: 9, scale: 1.18, anchorY: 0.9 },
  crown: { width: 44, dy: 2, scale: 0.92, anchorY: 0.86 },
  beret: { width: 54, dy: 8, scale: 1.2, anchorY: 0.88 },
};

const LENS_META: Record<
  Exclude<AvatarGlassesId, "none">,
  { lensCY: number; lensSpan: number }
> = {
  round: { lensCY: 0.5, lensSpan: 0.518 },
  sun: { lensCY: 0.5, lensSpan: 0.55 },
  heart: { lensCY: 0.52, lensSpan: 0.46 },
  smart: { lensCY: 0.5, lensSpan: 0.529 },
  hiphop: { lensCY: 0.5, lensSpan: 0.532 },
};

const GLASSES_TUNE: Record<
  Exclude<AvatarGlassesId, "none">,
  { dy: number; scale: number; widthMul: number }
> = {
  round: { dy: 0, scale: 1, widthMul: 1 },
  sun: { dy: 0, scale: 1, widthMul: 1.02 },
  heart: { dy: 0, scale: 1, widthMul: 1.03 },
  smart: { dy: 0, scale: 0.98, widthMul: 1 },
  hiphop: { dy: 0, scale: 1, widthMul: 1.02 },
};

const ACC_TUNE: Record<
  Exclude<AvatarAccessoryId, "none">,
  {
    width: number;
    dy: number;
    scale: number;
    opacity?: number;
    anchorY: number;
  }
> = {
  bow: { width: 24, dy: 0, scale: 0.9, anchorY: 0.4 },
  blush: { width: 50, dy: 0, scale: 1, opacity: 0.7, anchorY: 0.5 },
  bell: { width: 14, dy: 0, scale: 0.9, anchorY: 0.35 },
};

const LAYER =
  "pointer-events-none absolute select-none object-contain drop-shadow-[0_1.5px_3px_rgba(30,20,40,0.18)]";

type Props = {
  animal: AvatarPresetId;
  variant?: string;
  hat?: AvatarHatId;
  glasses?: AvatarGlassesId;
  accessory?: AvatarAccessoryId;
  size?: number;
  className?: string;
};

type LayerStyle = {
  left: number;
  top: number;
  width: number;
  scale: number;
  opacity?: number;
  anchorY?: number;
  maxHeight?: number;
};

function layerCss(s: LayerStyle): CSSProperties {
  const ay = s.anchorY ?? 0.5;
  return {
    left: `${s.left}%`,
    top: `${s.top}%`,
    width: `${s.width}%`,
    height: "auto",
    maxHeight: `${s.maxHeight ?? 52}%`,
    opacity: s.opacity ?? 1,
    transform: `translate(-50%, -${ay * 100}%) scale(${s.scale})`,
    transformOrigin: "center center",
  };
}

function resolveHat(
  animal: AvatarPresetId,
  variant: string,
  hat: Exclude<AvatarHatId, "none">,
): LayerStyle {
  const a = resolveAnimalOffsets(animal, variant).hat;
  const t = HAT_TUNE[hat];
  let top = a.top + t.dy;
  let scale = a.scale * t.scale;
  let width = t.width;
  const left = a.left;

  if (animal === "bunny") {
    if (hat === "ribbon") {
      top = 48;
      scale = 1.18;
      width = 46;
    } else if (hat === "crown") {
      top = 42;
      scale = 0.82;
      width = 42;
    } else if (hat === "beret") {
      top = 47;
      scale = 1.22;
      width = 50;
    }
  }

  return {
    left,
    top,
    width,
    scale,
    anchorY: t.anchorY,
    maxHeight: 68,
  };
}

function resolveGlasses(
  animal: AvatarPresetId,
  variant: string,
  glasses: Exclude<AvatarGlassesId, "none">,
): LayerStyle {
  const a = resolveAnimalOffsets(animal, variant).glasses;
  const t = GLASSES_TUNE[glasses];
  const lens = LENS_META[glasses];
  const ipd = a.ipd ?? 30;
  const width = (ipd / lens.lensSpan) * t.widthMul;

  return {
    left: a.left,
    top: a.top + t.dy,
    width,
    scale: a.scale * t.scale,
    anchorY: lens.lensCY,
  };
}

function resolveAccessory(
  animal: AvatarPresetId,
  variant: string,
  accessory: Exclude<AvatarAccessoryId, "none">,
): LayerStyle {
  const offsets = resolveAnimalOffsets(animal, variant);
  const a = offsets.accessory;
  const t = ACC_TUNE[accessory];

  if (accessory === "blush") {
    const g = offsets.glasses;
    return {
      left: a.left,
      top: g.top + 11,
      width: t.width,
      scale: a.scale * t.scale,
      opacity: t.opacity,
      anchorY: 0.5,
    };
  }

  return {
    left: a.left,
    top: a.top + t.dy,
    width: t.width,
    scale: a.scale * t.scale,
    opacity: t.opacity,
    anchorY: t.anchorY,
  };
}

export function PhotoClayAvatar({
  animal,
  variant,
  hat = "none",
  glasses = "none",
  accessory = "none",
  size = 120,
  className = "",
}: Props) {
  const resolvedVariant = resolveVariantId(
    animal,
    variant ?? defaultVariantId(animal),
  );
  const hatSrc = hat !== "none" ? HAT_SRC[hat] : undefined;
  const glassesSrc = glasses !== "none" ? GLASSES_SRC[glasses] : undefined;
  const accSrc = accessory !== "none" ? ACC_SRC[accessory] : undefined;

  return (
    <div
      className={`relative aspect-square shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={animalImageSrc(animal, resolvedVariant)}
        alt=""
        width={size}
        height={size}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />

      {accSrc && accessory !== "none" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${accSrc}?${CACHE}`}
          alt=""
          className={LAYER}
          style={layerCss(resolveAccessory(animal, resolvedVariant, accessory))}
          draggable={false}
        />
      ) : null}

      {glassesSrc && glasses !== "none" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${glassesSrc}?${CACHE}`}
          alt=""
          className={LAYER}
          style={layerCss(resolveGlasses(animal, resolvedVariant, glasses))}
          draggable={false}
        />
      ) : null}

      {hatSrc && hat !== "none" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${hatSrc}?${CACHE}`}
          alt=""
          className={LAYER}
          style={layerCss(resolveHat(animal, resolvedVariant, hat))}
          draggable={false}
        />
      ) : null}
    </div>
  );
}
