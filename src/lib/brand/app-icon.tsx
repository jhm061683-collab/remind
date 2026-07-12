type Props = {
  size: number;
  radius?: number;
  iconSize?: number;
};

/** favicon / apple-touch-icon / PWA 아이콘 공통 마크업 */
export function AppIconMark({ size, radius, iconSize }: Props) {
  const corner = radius ?? Math.round(size * 0.24);
  const glyph = iconSize ?? Math.round(size * 0.56);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: corner,
        background: "linear-gradient(135deg, #936dff 0%, #2563eb 100%)",
        boxShadow: "0 8px 24px rgba(37, 99, 235, 0.35)",
      }}
    >
      <svg viewBox="0 0 24 24" width={glyph} height={glyph} fill="white">
        <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 8.5L5.5 8 12 4.5 18.5 8 12 11.5zM3 19v-2h18v2H3z" />
      </svg>
    </div>
  );
}
