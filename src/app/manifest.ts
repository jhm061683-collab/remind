import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Re:mind",
    short_name: "Re:mind",
    description: "오답이 실력이 되는 타이밍 — 스마트 오답 복습 솔루션",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7fb",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
