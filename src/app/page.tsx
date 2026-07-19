import Link from "next/link";
import { RemindLogo } from "@/components/brand/remind-logo";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";

const FEATURES = [
  {
    number: "01",
    title: "AI 기반 디지털 문항 자동 추출",
    description:
      "문제 하나를 오려 붙이기 위해 소비했던 아까운 시간들. 이제 사진 한 장이면 복잡한 수식과 장문 지문까지 완벽한 디지털 문제로 변환됩니다. 선생님은 오직 수업과 학생에게만 집중하세요.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "에빙하우스 망각 곡선 기반 복습 주기 계산",
    description:
      "\u201c분명히 가르쳤는데 왜 또 틀릴까?\u201d라는 답답함을 과학적으로 해결합니다. AI가 학생별 망각 주기를 정밀하게 계산해 가장 효과적인 타이밍에 복습 문제를 피드합니다.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "강사 부담을 없앤 학생 주도형 4단계 인풋",
    description:
      "선생님이 대신 만들어주는 오답 노트는 지속되기 어렵습니다. 학생이 직접 촬영부터 메모까지 완료하는 직관적인 동선으로, 강사의 업무 부담은 덜고 학생의 메타인지는 키웁니다.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "원클릭 학부모 안심 보고서",
    description:
      "눈에 보이지 않는 학원의 세심한 케어를 데이터로 증명합니다. 클릭 몇 번으로 자동 생성되는 분석 리포트는 학부모의 불안을 깊은 안심과 신뢰로 바꿉니다.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    step: "1",
    title: "틀린 문항 촬영",
    description:
      "문제를 손으로 베껴 적는 비효율을 끝냅니다. 틀린 문제나 시험지를 카메라로 촬영해 업로드합니다.",
  },
  {
    step: "2",
    title: "AI 디지털 문제 변환",
    description:
      "정돈되지 않은 낙서 속에서도 AI가 수식과 지문만 정확히 인식하여 깔끔한 디지털 문항으로 재생성합니다.",
  },
  {
    step: "3",
    title: "맞춤형 핵심 메모",
    description:
      "\u201c계산 실수\u201d, \u201c개념 부족\u201d 등 학생이 직접 오답의 원인을 기록하며 스스로 취약점을 인지합니다.",
  },
  {
    step: "4",
    title: "자동 복습 주기 등록",
    description:
      "등록 즉시 망각 곡선 알고리즘에 반영되어, 학생이 완전히 정복할 때까지 맞춤형 주기로 찾아옵니다.",
  },
];

const AUDIENCES = [
  {
    role: "학생",
    roleEn: "Student",
    headline: "더는 오답 노트 정리하느라 아까운 시간을 버리지 마세요.",
    points: [
      "지루한 가위질을 끝내고 오직 복습에만 몰두하는 효율적 학습",
      "망각 주기에 맞춰 가장 적절한 때 배달되는 맞춤형 복습 문제",
      "연속으로 맞히며 눈으로 확인하는 '오답 정복'의 성취감",
    ],
  },
  {
    role: "강사",
    roleEn: "Teacher",
    headline: "선생님의 진심과 에너지가 온전히 '수업'에만 닿도록.",
    points: [
      "시험 기간마다 반복되던 교재 편집과 오답 타이핑 야근 해방",
      "학생이 직접 입력하는 시스템으로 교무 행정 업무 부담 제로화",
      "실시간 데이터 분석을 기반으로 더욱 정교하고 깊이 있어지는 밀착 상담",
    ],
  },
  {
    role: "원장",
    roleEn: "Owner",
    headline: "말로만 하는 꼼꼼함 대신, 데이터로 학원의 가치를 증명하세요.",
    points: [
      "우리 학원만의 독보적이고 과학적인 시스템으로 프리미엄 브랜드 정립",
      "퇴원 방어와 원생 등록을 강력하게 지원하는 학부모 안심 리포트 발행",
      "학원 전체의 학습 현황과 취약 과목을 한눈에 파악하는 통합 관리 대시보드",
    ],
  },
];

const FAQS = [
  {
    question: "수학 수식이나 영어 장문 지문도 인식이 잘 되나요?",
    answer:
      "네, 그렇습니다. 리마인드의 고성능 AI OCR 엔진은 복잡한 수식(LaTeX 변환 지원), 도표, 그래프는 물론 국어나 영어의 긴 지문까지 노이즈 없이 깨끗한 디지털 텍스트와 이미지로 추출해 냅니다.",
  },
  {
    question:
      "학생들이 학원에서 스마트폰을 사용할 수 없는데(혹은 없는 경우), 학원 공용 기기로도 이용 가능한가요?",
    answer:
      "네, 가능합니다. 리마인드는 웹앱(PWA) 기반으로 설계되어 학원 내 PC나 태블릿에서도 동일하게 작동합니다. 스마트폰이 없거나 사용이 제한된 경우, 원내 공용 태블릿으로 사진을 찍어 입력하거나 교무실 스캐너로 문항을 스캔하여 PC 웹 대시보드에서 드래그 앤 드롭으로 한 번에 등록할 수 있습니다.",
  },
  {
    question: "아이들이 오답을 직접 입력하는 걸 귀찮아하지 않을까요?",
    answer:
      "단순 텍스트 입력이 아닌 '사진 촬영 → 터치 몇 번'으로 끝나는 4단계 인터페이스로 설계되어 학생들이 게임 퀘스트처럼 쉽게 적응합니다. 또한 본인이 틀린 문제가 누적되고 '정복' 도장이 찍히는 과정을 보며 성취감을 느낍니다.",
  },
  {
    question: "학부모 안심 보고서는 어떻게 전달하나요?",
    answer:
      "선생님 대시보드에서 학생을 선택한 후 '보고서 생성' 버튼을 누르면 카카오톡, 문자 메시지로 보낼 수 있는 간편 공유 링크(URL)와 인쇄용 PDF가 즉시 만들어집니다. 일일이 편집할 필요가 전혀 없습니다.",
  },
  {
    question: "초기 도입 비용이나 약정 기간이 따로 있나요?",
    answer:
      "리마인드는 초기 설치비가 없는 SaaS(소프트웨어 서비스)입니다. 학원 규모(학생 수)에 맞는 합리적인 월간 구독 요금제로 운영되며, 별도의 위약금이나 약정 기간 없이 언제든 자유롭게 해지 및 변경이 가능합니다.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-white text-slate-900">
      {/* 상단 내비게이션 */}
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3">
          <RemindLogo href="/" size="md" />
          <nav className="flex items-center gap-4">
            <a
              href="#features"
              className="hidden text-sm font-semibold text-slate-500 transition hover:text-blue-700 sm:block"
            >
              핵심 기능
            </a>
            <a
              href="#faq"
              className="hidden text-sm font-semibold text-slate-500 transition hover:text-blue-700 sm:block"
            >
              자주 묻는 질문
            </a>
            <Link
              href="/login"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              로그인
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* SECTION 1. 히어로 */}
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
              오답이 실력이 되는
              <br className="sm:hidden" /> 과학적 타이밍,{" "}
              <span className="text-blue-600">리마인드</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-500 md:text-lg">
              선생님이 가위질과 타이핑으로 밤새우지 않도록, 학생이 같은 문제를
              또 틀려 좌절하지 않도록. 망각 곡선 기반 AI 오답 관리로 학원의
              전문성은 높이고 수고는 줄이세요.
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

        {/* SECTION 2. 핵심 기능 */}
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
                  key={feature.number}
                  className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:border-blue-100 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      {feature.icon}
                    </span>
                    <span className="text-sm font-extrabold tracking-widest text-slate-200">
                      {feature.number}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-bold leading-snug">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3. 이용 흐름 */}
        <section className="mx-auto w-full max-w-4xl px-4 py-14 md:py-16">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-blue-600">
            How it works
          </p>
          <h2 className="mt-2 text-center text-2xl font-extrabold tracking-tight md:text-3xl">
            이렇게 사용해요
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((item, index) => (
              <div
                key={item.step}
                className="relative rounded-2xl border border-slate-100 bg-white p-5"
              >
                {index < STEPS.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute -right-4 top-8 hidden text-slate-200 lg:block"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" />
                      <path d="M13 6l6 6-6 6" />
                    </svg>
                  </span>
                ) : null}
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

        {/* SECTION 4. 대상별 소구 */}
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
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-bold text-blue-700">
                    {audience.role}
                    <span className="font-semibold text-blue-400">
                      {audience.roleEn}
                    </span>
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

        {/* SECTION 5. 마지막 CTA */}
        <section className="mx-auto w-full max-w-4xl px-4 py-14 md:py-20">
          <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 px-6 py-12 text-center text-white shadow-xl shadow-blue-600/20 md:px-12">
            <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">
              선생님의 수고와 학생의 노력을
              <br className="hidden md:block" /> 확실한 &lsquo;실력&rsquo;으로
              증명할 시간
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-blue-100 md:text-base">
              관리의 깊이가 달라지면 학원의 격이 올라갑니다. 지금 리마인드와
              함께 스마트한 학습 관리를 시작하세요.
            </p>
            <Link
              href="/login"
              className="mt-7 inline-flex rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
            >
              도입 문의 및 7일 무료 체험 신청하기
            </Link>
          </div>
        </section>

        {/* SECTION 6. FAQ */}
        <section id="faq" className="border-t border-slate-100 bg-slate-50/60">
          <div className="mx-auto w-full max-w-3xl px-4 py-14 md:py-16">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-blue-600">
              FAQ
            </p>
            <h2 className="mt-2 text-center text-2xl font-extrabold tracking-tight md:text-3xl">
              자주 묻는 질문
            </h2>
            <div className="mt-8 space-y-3">
              {FAQS.map((faq) => (
                <details
                  key={faq.question}
                  className="group rounded-2xl border border-slate-100 bg-white shadow-sm open:border-blue-100"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-bold text-slate-800 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-start gap-2">
                      <span className="font-extrabold text-blue-600">Q.</span>
                      {faq.question}
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </summary>
                  <p className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-500">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-2 px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-center">
          <RemindLogo href="/" size="sm" />
          <p className="text-xs text-slate-400">
            오답이 실력이 되는 과학적 타이밍 · 스마트 오답 복습 솔루션
          </p>
        </div>
      </footer>
    </div>
  );
}
