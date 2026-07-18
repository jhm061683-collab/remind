import Link from "next/link";
import {
  IconArchive,
  IconHome,
  IconPlusPhoto,
  IconStudy,
} from "@/components/ui/icons";

const guides = [
  {
    Icon: IconPlusPhoto,
    title: "1. 틀린 문제 등록하기",
    description:
      "「등록」에서 문제 사진을 올리고 과목을 고른 뒤 저장하세요. 긴 문제는 사진을 2장까지 넣을 수 있어요.",
    href: "/upload",
    action: "문제 등록하러 가기",
  },
  {
    Icon: IconStudy,
    title: "2. 오늘 문제 다시 풀기",
    description:
      "「다시 풀기」에 오늘 복습할 문제가 자동으로 나타나요. 풀고 나서 맞힘·틀림을 누르면 다음 날짜가 정해져요.",
    href: "/study/today",
    action: "오늘 문제 보기",
  },
  {
    Icon: IconArchive,
    title: "3. 익힌 문제 보관하기",
    description:
      "충분히 익힌 문제는 보관함으로 옮겨져요. 필요할 때 다시 꺼내 볼 수 있어요.",
    href: "/archive",
    action: "보관함 보기",
  },
  {
    Icon: IconHome,
    title: "4. 홈에서 기록 확인하기",
    description:
      "오늘 할 문제, 연속 학습, 이번 주 등록·복습 기록을 홈에서 한눈에 확인하세요.",
    href: "/dashboard",
    action: "홈으로 가기",
  },
] as const;

export function StudentHelpContent() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
        <p className="text-sm font-semibold">핵심은 세 가지예요</p>
        <p className="mt-1 text-sm leading-relaxed">
          틀린 문제를 <strong>등록</strong>하고 → 정해진 날에{" "}
          <strong>다시 풀고</strong> → 익힌 문제를 <strong>보관</strong>해요.
        </p>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        {guides.map(({ Icon, title, description, href, action }) => (
          <section
            key={title}
            className="flex flex-col rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Icon size={23} />
            </div>
            <h2 className="mt-3 font-bold text-[var(--rm-text)]">{title}</h2>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-[var(--rm-text-muted)]">
              {description}
            </p>
            <Link
              href={href}
              prefetch={false}
              className="mt-4 text-sm font-semibold text-blue-600 hover:underline"
            >
              {action} →
            </Link>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4">
        <h2 className="font-bold text-[var(--rm-text)]">자주 묻는 질문</h2>
        <dl className="mt-3 space-y-4 text-sm">
          <div>
            <dt className="font-semibold text-[var(--rm-text)]">
              오늘 볼 문제가 없어요.
            </dt>
            <dd className="mt-1 text-[var(--rm-text-muted)]">
              아직 복습 날짜가 되지 않았거나 등록한 문제가 없을 수 있어요. 먼저
              문제를 등록해 주세요.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--rm-text)]">
              비밀번호를 잊었어요.
            </dt>
            <dd className="mt-1 text-[var(--rm-text-muted)]">
              학원 원장님이나 선생님께 임시 비밀번호 발급을 요청해 주세요.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--rm-text)]">
              사용 중 불편한 점이 있어요.
            </dt>
            <dd className="mt-1 text-[var(--rm-text-muted)]">
              계정 메뉴의 「건의사항」에서 알려 주세요.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
