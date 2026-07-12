import Link from "next/link";

type Props = {
  href: string;
  label?: string;
};

/** 모바일 상단 뒤로가기 (아이폰 스타일) */
export function BackBar({ href, label = "뒤로" }: Props) {
  return (
    <div className="mb-4 md:mb-5">
      <Link
        href={href}
        className="inline-flex min-h-[44px] items-center gap-1 rounded-xl px-2 py-2 text-sm font-semibold text-blue-600 transition active:bg-blue-50 touch-manipulation"
      >
        <span aria-hidden className="text-lg leading-none">
          ‹
        </span>
        {label}
      </Link>
    </div>
  );
}
