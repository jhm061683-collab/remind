import { ImageResponse } from "next/og";
import { AppIconMark } from "@/lib/brand/app-icon";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<AppIconMark size={32} radius={8} iconSize={20} />, { ...size });
}
