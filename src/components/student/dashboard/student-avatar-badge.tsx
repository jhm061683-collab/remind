"use client";

import {
  isHttpAvatarUrl,
  parseAvatarConfig,
  resolveAvatarBackgroundCss,
  type AvatarConfig,
} from "@/lib/avatars/presets";
import { PhotoClayAvatar } from "@/components/student/dashboard/photo-clay-avatar";

type Size = "sm" | "md" | "lg" | "xl";

const SIZE_PX: Record<Size, number> = {
  sm: 44,
  md: 60,
  lg: 76,
  xl: 148,
};

type Props = {
  value?: string | null;
  seed?: string;
  size?: Size;
  className?: string;
  alt?: string;
  config?: AvatarConfig;
};

export function StudentAvatarBadge({
  value,
  seed = "student",
  size = "md",
  className = "",
  alt = "",
  config: configProp,
}: Props) {
  const px = SIZE_PX[size];

  if (!configProp && isHttpAvatarUrl(value)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={value!}
        alt={alt}
        width={px}
        height={px}
        className={`shrink-0 rounded-2xl object-cover ${className}`}
        style={{ width: px, height: px }}
      />
    );
  }

  const config = configProp ?? parseAvatarConfig(value, seed);
  const bgCss = resolveAvatarBackgroundCss(config);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl ${className}`}
      style={{
        width: px,
        height: px,
        background: bgCss,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45)",
      }}
      role="img"
      aria-label={alt || "캐릭터"}
    >
      <PhotoClayAvatar
        animal={config.animal}
        variant={config.variant}
        hat={config.hat}
        glasses={config.glasses}
        accessory={config.accessory}
        size={px}
        className="rounded-2xl"
      />
    </span>
  );
}
