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

export function SubAdminsList({ subAdmins }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubAdminRow | null>(null);

  if (subAdmins.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-500 shadow-sm">
        등록된 선생님이 없습니다. 위에서 계정을 추가해 주세요.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="whitespace-nowrap px-3 py-2 font-medium">이름</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">아이디</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">권한</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">담당</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {subAdmins.map((row) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap px-3 py-2 font-medium text-zinc-900">
                  {row.displayName}
                  {row.isDirector ? (
                    <span className="ml-1.5 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                      팀장
                    </span>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-zinc-600">
                  {row.username}
                </td>
                <td className="px-3 py-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-zinc-700">
                    <input
                      type="checkbox"
                      checked={row.isDirector}
                      disabled={pending}
                      className="rounded border-zinc-300"
                      onChange={(e) => {
                        const next = e.target.checked;
                        startTransition(async () => {
                          const res = await setSubAdminTeamLeadAction(
                            row.id,
                            next,
                          );
                          setFeedback(res.error ?? res.success ?? null);
                          router.refresh();
                        });
                      }}
                    />
                    팀장
                  </label>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-zinc-800">
                  {row.assignedCount}명
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setDeleteTarget(row)}
                    className="whitespace-nowrap rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {feedback ? (
        <p className="mt-3 text-sm text-zinc-700">{feedback}</p>
      ) : null}

      <p className="mt-2 text-[11px] text-zinc-500">
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
