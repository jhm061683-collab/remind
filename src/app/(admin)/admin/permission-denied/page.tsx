import { PageHeader } from "@/components/ui/page-header";
import { getSession } from "@/lib/auth/session";
import { staffRoleLabel } from "@/lib/auth/staff-mode";
import { getHomePathForRole } from "@/lib/auth/users";
import Link from "next/link";

type Props = {
  searchParams?: Promise<{ need?: string; from?: string }>;
};

function needLabel(need: string | undefined): string {
  if (need === "admin") return "원장 권한";
  if (need === "staff") return "학원 관리 권한";
  if (need === "assigned-student") return "담당 학생 접근 권한";
  return "이 화면 권한";
}

export default async function PermissionDeniedPage({ searchParams }: Props) {
  const session = await getSession();
  const params = (await searchParams) ?? {};
  const roleLabel = session ? staffRoleLabel(session.role) : "비로그인";
  const home = session ? getHomePathForRole(session.role) : "/login";

  return (
    <div className="mx-auto max-w-lg py-6">
      <PageHeader
        title="이 화면을 볼 수 없습니다"
        description="권한이 없는 주소로 들어왔습니다. 주소만 알아도 데이터가 보이지는 않습니다."
      />
      <section className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm">
        <dl className="space-y-2 text-sm text-[var(--rm-text)]">
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--rm-text-muted)]">현재 역할</dt>
            <dd className="font-semibold">{roleLabel}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--rm-text-muted)]">필요한 권한</dt>
            <dd className="font-semibold">{needLabel(params.need)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm leading-relaxed text-[var(--rm-text-muted)]">
          {params.need === "assigned-student"
            ? "선생님 계정에서는 직접 배정되었거나 담당 반에 속한 학생만 볼 수 있습니다. 학생 정보는 노출되지 않았습니다."
            : "선생님 계정은 반·결제·선생님 관리 화면을 열 수 없습니다. 원장 계정은 「내 담당」으로 보고 있어도 이 화면은 그대로 열 수 있습니다."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={home}
            className="rounded-xl bg-[var(--rm-brand)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            내 홈으로
          </Link>
          {params.from ? (
            <Link
              href={params.from}
              className="rounded-xl border border-[var(--rm-border)] px-4 py-2.5 text-sm font-semibold text-[var(--rm-text)]"
            >
              이전 화면
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
