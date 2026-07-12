import Link from "next/link";
import { RemindLogo } from "@/components/brand/remind-logo";
import { BRAND_SUBLINE, BRAND_TAGLINE } from "@/lib/constants/brand-copy";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <main className="w-full max-w-lg text-center">
        <div className="mb-8 flex justify-center">
          <RemindLogo href="/" size="lg" />
        </div>
        <h1 className="text-2xl font-bold leading-snug tracking-tight text-slate-900 sm:text-3xl">
          {BRAND_TAGLINE}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-500">
          {BRAND_SUBLINE}
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            로그인
          </Link>
        </div>
      </main>
    </div>
  );
}
