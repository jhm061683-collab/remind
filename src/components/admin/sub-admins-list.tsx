"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deactivateSubAdminAction,
  setSubAdminTeamLeadAction,
} from "@/lib/actions/admin";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { SubAdminRow } from "@/lib/types/admin";

type Props = {
  subAdmins: SubAdminRow[];
};

function TeamLeadToggle({
  row,
  pending,
  onToggle,
}: {
  row: SubAdminRow;
  pending: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-[var(--rm-text)]">
      <input
        type="checkbox"
        checked={row.isDirector}
        disabled={pending}
        className="h-4 w-4 rounded border-[var(--rm-border)]"
        onChange={(e) => onToggle(e.target.checked)}
      />
      팀장
    </label>
  );
}

export function SubAdminsList({ subAdmins }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<SubAdminRow | null>(null);

  function handleTeamLead(rowId: string, next: boolean) {
    startTransition(async () => {
      const res = await setSubAdminTeamLeadAction(rowId, next);
      setFeedback(res.error ?? res.success ?? null);
      router.refresh();
    });
  }

  if (subAdmins.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-4 py-6 text-center text-sm text-[var(--rm-text-muted)] shadow-sm">
        등록된 선생님이 없습니다. 위에서 계정을 추가해 주세요.
      </p>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] shadow-sm md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--rm-border)] bg-[var(--rm-surface-raised)] text-[var(--rm-text-muted)]">
            <tr>
              <th className="whitespace-nowrap px-3 py-2 font-medium">이름</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">아이디</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">권한</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">담당</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--rm-border)]">
            {subAdmins.map((row) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap px-3 py-2 font-medium text-[var(--rm-text)]">
                  {row.displayName}
                  {row.isDirector ? (
                    <span className="ml-1.5 rounded-full bg-[var(--rm-accent-muted)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--rm-brand-violet)]">
                      팀장
                    </span>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-[var(--rm-text-muted)]">
                  {row.username}
                </td>
                <td className="px-3 py-2">
                  <TeamLeadToggle
                    row={row}
                    pending={pending}
                    onToggle={(next) => handleTeamLead(row.id, next)}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-[var(--rm-text)]">
                  {row.assignedCount}명
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setDeactivateTarget(row)}
                    className="whitespace-nowrap rounded-lg border border-[var(--rm-error-border)] bg-[var(--rm-error-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--rm-text-on-error)] hover:bg-[var(--rm-error-bg)] disabled:opacity-50"
                  >
                    비활성화
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-2 md:hidden">
        {subAdmins.map((row) => (
          <li
            key={row.id}
            className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3.5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5 text-base font-semibold text-[var(--rm-text)]">
                  {row.displayName}
                  {row.isDirector ? (
                    <span className="rounded-full bg-[var(--rm-accent-muted)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--rm-brand-violet)]">
                      팀장
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-sm text-[var(--rm-text-muted)]">
                  {row.username}
                </p>
              </div>
              <p className="shrink-0 text-sm font-medium text-[var(--rm-text)]">
                담당 {row.assignedCount}명
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--rm-border)] pt-3">
              <TeamLeadToggle
                row={row}
                pending={pending}
                onToggle={(next) => handleTeamLead(row.id, next)}
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => setDeactivateTarget(row)}
                className="min-h-[44px] rounded-xl border border-[var(--rm-error-border)] bg-[var(--rm-error-bg)] px-4 text-sm font-semibold text-[var(--rm-text-on-error)] disabled:opacity-50"
              >
                비활성화
              </button>
            </div>
          </li>
        ))}
      </ul>

      {feedback ? (
        <p className="mt-3 text-sm text-[var(--rm-text)]">{feedback}</p>
      ) : null}

      <p className="mt-2 text-[11px] text-[var(--rm-text-muted)]">
        팀장은 여러 명 가능 · 관리자/선생님 모드 전환 · 비활성화 시 반은 유지
      </p>

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title="선생님 계정 비활성화"
        description={
          deactivateTarget
            ? `${deactivateTarget.displayName} (${deactivateTarget.username}) 선생님을 비활성화할까요?\n\n담당 학생 ${deactivateTarget.assignedCount}명, 담당 반 ${deactivateTarget.classCount}개에서 담당이 해제됩니다.\n반은 그대로 남고, 이 계정은 로그인할 수 없습니다.`
            : ""
        }
        confirmLabel="비활성화"
        variant="danger"
        loading={pending}
        onCancel={() => setDeactivateTarget(null)}
        onConfirm={() => {
          if (!deactivateTarget) return;
          const target = deactivateTarget;
          startTransition(async () => {
            const res = await deactivateSubAdminAction(target.id);
            setFeedback(res.error ?? res.success ?? null);
            setDeactivateTarget(null);
            router.refresh();
          });
        }}
      />
    </>
  );
}
