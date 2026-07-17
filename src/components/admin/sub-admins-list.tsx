"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteSubAdminAction,
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
  const [deleteTarget, setDeleteTarget] = useState<SubAdminRow | null>(null);

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
                    onClick={() => setDeleteTarget(row)}
                    className="whitespace-nowrap rounded-lg border border-[var(--rm-error-border)] bg-[var(--rm-error-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--rm-text-on-error)] hover:bg-[var(--rm-error-bg)] disabled:opacity-50"
                  >
                    삭제
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
                onClick={() => setDeleteTarget(row)}
                className="min-h-[44px] rounded-xl border border-[var(--rm-error-border)] bg-[var(--rm-error-bg)] px-4 text-sm font-semibold text-[var(--rm-text-on-error)] disabled:opacity-50"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>

      {feedback ? (
        <p className="mt-3 text-sm text-[var(--rm-text)]">{feedback}</p>
      ) : null}

      <p className="mt-2 text-[11px] text-[var(--rm-text-muted)]">
        팀장은 여러 명 가능 · 관리자/선생님 모드 전환 · 삭제 시 반은 유지
      </p>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="선생님 계정 삭제"
        description={
          deleteTarget
            ? `${deleteTarget.displayName} (${deleteTarget.username}) 계정을 삭제할까요?\n\n반은 그대로 유지되고, 이 선생님의 반 담당·학생 배정만 해제됩니다. 나중에 반 관리에서 담당 선생님을 다시 지정하면 됩니다.`
            : ""
        }
        confirmLabel="삭제"
        variant="danger"
        loading={pending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          startTransition(async () => {
            const res = await deleteSubAdminAction(target.id);
            setFeedback(res.error ?? res.success ?? null);
            setDeleteTarget(null);
            router.refresh();
          });
        }}
      />
    </>
  );
}
