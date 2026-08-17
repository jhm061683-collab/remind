import Link from "next/link";
import {
  IconArchive,
  IconHome,
  IconPlusPhoto,
  IconStudy,
} from "@/components/ui/icons";
import { UI_LABELS } from "@/lib/constants/ui-labels";

const guides = [
  {
    Icon: IconPlusPhoto,
    title: `1. ${UI_LABELS.registerTab} — 틀린 문제 올리기`,
    description:
      "「등록」에서 사진을 올리고 정답을 직접 입력해요. AI 정리는 문제 글자·수식·그림을 읽기 좋게 만드는 용도이고, 정답은 풀어 주지 않아요. 긴 지문은 사진 최대 5장까지 이어 올릴 수 있어요.",
    href: "/upload",
    action: "문제 등록하러 가기",
  },
  {
    Icon: IconStudy,
    title: `2. ${UI_LABELS.studyTab}`,
    description:
      "「다시 풀기」에 오늘 볼 문제가 자동으로 나타나요. 먼저 내 답을 적고 「정답 확인」한 뒤 맞힘·틀림을 누르면 다음 날짜가 정해져요. 오늘 할 문제가 없으면 예정만 보이거나, 새 문제를 등록해 주세요.",
    href: "/study/today",
    action: "오늘 문제 보기",
  },
  {
    Icon: IconArchive,
    title: `3. ${UI_LABELS.archivePageTitle}`,
    description:
      "다시 푸는 중·보관 완료한 문제를 「보관함」에서 찾아요. 충분히 익힌 문제는 「보관 완료」로 남겨 둘 수 있어요.",
    href: "/archive",
    action: "보관함 보기",
  },
  {
    Icon: IconHome,
    title: "4. 홈에서 기록 확인하기",
    description:
      "오늘 다시 풀 문제, 연속 학습, 이번 주 등록·다시 풀기 기록을 홈에서 한눈에 확인하세요.",
    href: "/dashboard",
    action: "홈으로 가기",
  },
] as const;

export function StudentHelpContent() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[var(--rm-info-border)] bg-[var(--rm-info-bg)] p-4 text-[var(--rm-text-on-info)]">
        <p className="text-sm font-semibold">핵심은 세 가지예요</p>
        <p className="mt-1 text-sm leading-relaxed">
          틀린 문제를 <strong>등록</strong>하고 → 정해진 날에{" "}
          <strong>다시 풀고</strong> → 익힌 문제를 <strong>보관함</strong>에
          남겨요.
        </p>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        {guides.map(({ Icon, title, description, href, action }) => (
          <section
            key={title}
            className="flex flex-col rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--rm-brand)] text-white">
              <Icon size={23} />
            </div>
            <h2 className="mt-3 font-bold text-[var(--rm-text)]">{title}</h2>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-[var(--rm-text-muted)]">
              {description}
            </p>
            <Link
              href={href}
              prefetch={false}
              className="mt-4 text-sm font-semibold text-[var(--rm-nav-active)] hover:underline"
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
              AI가 정답도 알려 주나요?
            </dt>
            <dd className="mt-1 text-[var(--rm-text-muted)]">
              아니요. AI는 문제 본문·수식·그림을 정리만 해요. 정답은 해설지·답안을
              보고 직접 입력해요.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--rm-text)]">
              오늘 다시 풀 문제가 없어요.
            </dt>
            <dd className="mt-1 text-[var(--rm-text-muted)]">
              아직 날짜가 안 됐거나 등록한 문제가 없을 수 있어요. 「다시 풀기」에서
              예정을 확인하거나, 「등록」으로 새 오답을 올려 보세요.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--rm-text)]">
              과목이 없다고 나와요.
            </dt>
            <dd className="mt-1 text-[var(--rm-text-muted)]">
              계정 메뉴 → 「과목 설정」에서 과목을 먼저 추가해 주세요. 학원에서
              과목을 정해 둔 경우도 있어요.
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

      <p className="text-center text-xs text-[var(--rm-text-muted)]">
        <Link href="/subjects" className="font-semibold text-[var(--rm-nav-active)] hover:underline">
          과목 설정
        </Link>
        에서 과목 이름·다시 풀기 주기도 바꿀 수 있어요.
      </p>
    </div>
  );
}
