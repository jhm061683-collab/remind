import { formatKrw, PLAN_DEFINITIONS } from "@/lib/billing/plans";

type PlanCardModel = {
  code: string;
  name: string;
  pricePerStudentKrw: number;
  ocrDailyLimit: number;
  description?: string | null;
  highlight?: boolean;
  features?: string[];
};

type Props = {
  plans?: PlanCardModel[];
  currentPlanCode?: string | null;
  studentCount?: number;
  /** owner가 바꿀 때 */
  selectable?: boolean;
  onSelectPlanCode?: (code: string) => void;
  pending?: boolean;
  footnote?: string;
};

function featuresFor(plan: PlanCardModel): string[] {
  if (plan.features?.length) return plan.features;
  const def = PLAN_DEFINITIONS.find((d) => d.code === plan.code);
  if (def) return def.features;
  const ocr =
    plan.ocrDailyLimit <= 0
      ? "AI로 읽기(OCR) 없음"
      : `AI로 읽기 하루 최대 ${plan.ocrDailyLimit}문제`;
  return [
    `학생당 월 ${formatKrw(plan.pricePerStudentKrw)}`,
    "오답 등록·복습 무제한",
    ocr,
  ];
}

export function PlanCards({
  plans,
  currentPlanCode,
  studentCount = 0,
  selectable = false,
  onSelectPlanCode,
  pending = false,
  footnote,
}: Props) {
  const list =
    plans && plans.length > 0
      ? plans
      : PLAN_DEFINITIONS.map((d) => ({
          code: d.code,
          name: d.name,
          pricePerStudentKrw: d.pricePerStudentKrw,
          ocrDailyLimit: d.ocrDailyLimit,
          description: d.description,
          highlight: d.highlight,
          features: d.features,
        }));

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        {list.map((plan) => {
          const current = currentPlanCode === plan.code;
          const monthly = plan.pricePerStudentKrw * Math.max(0, studentCount);
          return (
            <div
              key={plan.code}
              className={`relative flex flex-col rounded-2xl border p-4 ${
                plan.highlight
                  ? "border-blue-500 bg-[var(--rm-surface)] shadow-sm"
                  : "border-[var(--rm-border)] bg-[var(--rm-surface)]"
              } ${current ? "ring-2 ring-blue-500" : ""}`}
            >
              {plan.highlight ? (
                <span className="absolute -top-2.5 left-4 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  추천
                </span>
              ) : null}
              <p className="text-lg font-bold tracking-tight">{plan.name}</p>
              <p className="mt-1 text-2xl font-bold">
                {formatKrw(plan.pricePerStudentKrw)}
                <span className="text-sm font-medium text-[var(--rm-text-muted)]">
                  {" "}
                  / 학생·월
                </span>
              </p>
              {plan.description ? (
                <p className="mt-2 text-xs text-[var(--rm-text-muted)]">
                  {plan.description}
                </p>
              ) : null}
              {studentCount > 0 ? (
                <p className="mt-2 text-xs text-[var(--rm-text-faint)]">
                  지금 학생 {studentCount}명 → 월 {formatKrw(monthly)}
                </p>
              ) : null}
              <ul className="mt-3 flex-1 space-y-1.5 text-sm text-[var(--rm-text)]">
                {featuresFor(plan).map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-blue-600">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {selectable && onSelectPlanCode ? (
                <button
                  type="button"
                  disabled={pending || current}
                  onClick={() => onSelectPlanCode(plan.code)}
                  className={`mt-4 rounded-xl px-3 py-2.5 text-sm font-semibold disabled:opacity-50 ${
                    current
                      ? "border border-[var(--rm-border)] text-[var(--rm-text-muted)]"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {current ? "현재 요금제" : `${plan.name}으로 변경`}
                </button>
              ) : (
                <p className="mt-4 text-center text-xs font-medium text-[var(--rm-text-muted)]">
                  {current ? "현재 이용 중" : " "}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {footnote ? (
        <p className="text-xs text-[var(--rm-text-muted)]">{footnote}</p>
      ) : null}
    </div>
  );
}
