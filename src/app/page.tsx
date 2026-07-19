import Link from "next/link";
import { RemindLogo } from "@/components/brand/remind-logo";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
import { BRAND_SUBLINE, BRAND_TAGLINE } from "@/lib/constants/brand-copy";

const FEATURES = [
  {
    title: "사진 한 장이면 등록 끝",
    description:
      "틀린 문제를 찍어 올리면 AI가 문제·수식·그림까지 깔끔한 디지털 문제로 정리해 줘요. 손으로 옮겨 적을 필요가 없어요.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    title: "잊을 때쯤 다시 풀기",
    description:
      "복습 주기를 자동으로 계산해서 오늘 다시 풀어야 할 문제를 알려줘요. 완전히 내 것이 될 때까지 반복해요.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 4v6h6" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </svg>
    ),
  },
  {
    title: "학부모 안심 보고서",
    description:
      "원장님·강사님이 클릭 몇 번으로 학생별 학습 리포트를 만들어 링크나 PDF로 학부모께 바로 전달할 수 있어요.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
      </svg>
    ),
  },
  {
    title: "학원 운영이 한눈에",
    description:
      "학생별 등록·복습 현황부터 AI 사용량까지 대시보드에서 한 번에 관리해요. 상담과 퇴원 방어의 근거가 쌓여요.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" />
        <path d="M12 20V4" />
        <path d="M6 20v-6" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    step: "1",
    title: "사진 올리기",
    description: "틀린 문제를 스마트폰으로 찍어 올려요. 여러 장도 한 번에.",
  },
  {
    step: "2",
    title: "AI가 문제 정리",
    description: "수식·그림·지문까지 AI가 깔끔한 문제로 다시 만들어요.",
  },
  {
    step: "3",
    title: "잊을 때쯤 다시 풀기",
    description: "복습 타이밍이 되면 오늘의 미션으로 알려줘요.",
  },
  {
    step: "4",
    title: "정복하고 보관",
    description: "연속으로 맞히면 정복! 언제든 보관함에서 다시 찾아봐요.",
  },
];

const AUDIENCES = [
  {
    role: "학생",
    headline: "오답 정리가 숙제가 아니라 습관이 돼요",
    points: [
      "사진만 찍으면 등록 끝, 입력 부담 최소화",
      "오늘 풀 문제를 앱이 알아서 골라줘요",
      "정복한 문제가 쌓이는 걸 눈으로 확인",
    ],
  },
  {
    role: "강사",
    headline: "입력은 학생이, 관리는 클릭 몇 번으로",
    points: [
      "담당 학생의 오답 현황을 실시간 확인",
      "취약 과목·오답 이유가 자동으로 정리",
      "학부모 보고서를 직접 만들어 전달",
    ],
  },
  {
    role: "원장",
    headline: "상담과 퇴원 방어의 확실한 무기",
    points: [
      "학원 전체 학습 데이터를 한눈에",
      "학부모께 보내는 안심 보고서로 신뢰 확보",
      "요금제별 AI 사용량까지 투명하게 관리",
    ],
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-white text-slate-900">
      {/* 상단 내비게이션 */}
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3">
          <RemindLogo href="/" size="md" />
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            로그인
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* 히어로 */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(37,99,235,0.10), transparent), radial-gradient(ellipse 50% 40% at 90% 10%, rgba(147,109,255,0.08), transparent)",
            }}
          />
          <div className="relative mx-auto w-full max-w-4xl px-4 pb-14 pt-16 text-center md:pb-20 md:pt-24">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              학원 전용 AI 오답노트 솔루션
            </span>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]">
              {BRAND_TAGLINE}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-500 md:text-lg">
              {BRAND_SUBLINE}. 학생은 사진 한 장으로 오답을 등록하고, AI가
              문제를 깔끔하게 정리하고, 잊을 때쯤 다시 풀게 해줘요. 원장님과
              강사님은 데이터로 학부모의 신뢰를 얻으세요.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="w-full rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 sm:w-auto"
              >
                로그인하고 시작하기
              </Link>
              <a
                href="#features"
                className="w-full rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 sm:w-auto"
              >
                기능 둘러보기
              </a>
              {/* 모바일에서만 렌더 — 데스크톱 웹 설치 권유 없음 */}
              <div className="md:hidden">
                <InstallAppPrompt variant="button" />
              </div>
            </div>
          </div>
        </section>

        {/* 핵심 기능 */}
        <section id="features" className="border-t border-slate-100 bg-slate-50/60">
          <div className="mx-auto w-full max-w-4xl px-4 py-14 md:py-16">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-blue-600">
              Features
            </p>
            <h2 className="mt-2 text-center text-2xl font-extrabold tracking-tight md:text-3xl">
              오답 관리에 필요한 전부
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:border-blue-100 hover:shadow-md"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    {feature.icon}
                  </span>
                  <h3 className="mt-4 text-base font-bold">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 이용 흐름 */}
        <section className="mx-auto w-full max-w-4xl px-4 py-14 md:py-16">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-blue-600">
            How it works
          </p>
          <h2 className="mt-2 text-center text-2xl font-extrabold tracking-tight md:text-3xl">
            학생은 딱 4단계면 충분해요
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((item) => (
              <div
                key={item.step}
                className="relative rounded-2xl border border-slate-100 bg-white p-5"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-extrabold text-white">
                  {item.step}
                </span>
                <h3 className="mt-3 text-sm font-bold">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 대상별 가치 */}
        <section className="border-t border-slate-100 bg-slate-50/60">
          <div className="mx-auto w-full max-w-4xl px-4 py-14 md:py-16">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-blue-600">
              For everyone
            </p>
            <h2 className="mt-2 text-center text-2xl font-extrabold tracking-tight md:text-3xl">
              학생·강사·원장 모두를 위해
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {AUDIENCES.map((audience) => (
                <div
                  key={audience.role}
                  className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
                >
                  <span className="inline-flex rounded-full bg-blue-600/10 px-3 py-1 text-xs font-bold text-blue-700">
                    {audience.role}
                  </span>
                  <h3 className="mt-3 text-base font-bold leading-snug">
                    {audience.headline}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {audience.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-2 text-sm leading-relaxed text-slate-500"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="mt-0.5 h-4 w-4 shrink-0 text-blue-500"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 마지막 CTA */}
        <section className="mx-auto w-full max-w-4xl px-4 py-14 md:py-20">
          <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 px-6 py-12 text-center text-white shadow-xl shadow-blue-600/20 md:px-12">
            <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">
              우리 학원에도 도입해 보세요
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-blue-100 md:text-base">
              계정을 받으셨다면 지금 바로 로그인하세요. 도입 문의는 학원
              담당자에게 안내해 드려요.
            </p>
            <Link
              href="/login"
              className="mt-7 inline-flex rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
            >
              로그인
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-2 px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-center">
          <RemindLogo href="/" size="sm" />
          <p className="text-xs text-slate-400">
            {BRAND_TAGLINE} · {BRAND_SUBLINE}
          </p>
        </div>
      </footer>
    </div>
  );
}
