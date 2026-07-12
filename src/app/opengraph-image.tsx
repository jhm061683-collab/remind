import { ImageResponse } from "next/og";
import { BRAND_SUBLINE, BRAND_TAGLINE } from "@/lib/constants/brand-copy";

export const alt = `Re:mind — ${BRAND_SUBLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const fontData = await fetch(
    "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.otf",
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px 32px",
          background: "linear-gradient(145deg, #0f172a 0%, #1e1b4b 45%, #172554 100%)",
          fontFamily: "Pretendard",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 136,
              height: 136,
              borderRadius: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #936dff 0%, #2563eb 100%)",
              boxShadow:
                "0 0 48px rgba(147, 109, 255, 0.5), 0 0 96px rgba(37, 99, 235, 0.3)",
            }}
          >
            <svg viewBox="0 0 24 24" width="80" height="80" fill="white">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 8.5L5.5 8 12 4.5 18.5 8 12 11.5zM3 19v-2h18v2H3z" />
            </svg>
          </div>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span
              style={{
                fontSize: 112,
                fontWeight: 700,
                color: "#f8fafc",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              Re
            </span>
            <span
              style={{
                fontSize: 112,
                fontWeight: 700,
                color: "#60a5fa",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              :
            </span>
            <span
              style={{
                fontSize: 112,
                fontWeight: 700,
                color: "#f8fafc",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              mind
            </span>
          </div>
        </div>
        <p
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#f1f5f9",
            margin: 0,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            whiteSpace: "nowrap",
          }}
        >
          {BRAND_TAGLINE}
        </p>
        <p
          style={{
            fontSize: 44,
            fontWeight: 700,
            color: "#94a3b8",
            marginTop: 12,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            whiteSpace: "nowrap",
          }}
        >
          {BRAND_SUBLINE}
        </p>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Pretendard", data: fontData, style: "normal", weight: 700 }],
    },
  );
}
