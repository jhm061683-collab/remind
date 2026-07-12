import Link from "next/link";

type Props = {
  href?: string;
  size?: "sm" | "md" | "lg";
};

export function RemindLogo({ href = "/dashboard", size = "md" }: Props) {
  const textSize =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  const iconSize =
    size === "lg" ? "h-9 w-9" : size === "sm" ? "h-7 w-7" : "h-8 w-8";

  return (
    <Link href={href} className="brand-logo inline-flex items-center gap-2">
      <span
        className={`brand-logo-icon flex ${iconSize} items-center justify-center text-white`}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 8.5L5.5 8 12 4.5 18.5 8 12 11.5zM3 19v-2h18v2H3z" />
        </svg>
      </span>
      <span className={`brand-logo-text ${textSize} tracking-tight`}>
        Re<span className="brand-logo-colon">:</span>mind
      </span>
    </Link>
  );
}
