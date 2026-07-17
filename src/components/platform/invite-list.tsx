"use client";

import { useState, useTransition } from "react";
import { revokeInviteAction } from "@/lib/actions/platform";
import type { AcademyInviteRow } from "@/lib/server/platform/queries";
import { formatKrw } from "@/lib/billing/pricing";

const STATUS_LABEL: Record<AcademyInviteRow["status"], string> = {
  pending: "대기",
  accepted: "가입됨",
  revoked: "취소",
  expired: "만료",
};

function InviteCopyButton({
  token,
  disabled,
}: {
  token: string;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/join/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={copy}
      className="rounded-lg border border-[var(--rm-border)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--rm-surface-raised)] disabled:opacity-40"
    >
      {copied ? "복사됨" : "링크 복사"}
    </button>
  );
}

export function InviteList({ invites }: { invites: AcademyInviteRow[] }) {
  const [pending, startTransition] = useTransition();

  if (invites.length === 0) {
    return (
      <p className="text-sm text-[var(--rm-text-muted)]">
        아직 초대 링크가 없습니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)]">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[var(--rm-border)] text-xs text-[var(--rm-text-muted)]">
          <tr>
            <th className="px-4 py-3 font-medium">코드</th>
            <th className="px-4 py-3 font-medium">요금제</th>
            <th className="px-4 py-3 font-medium">상태</th>
            <th className="px-4 py-3 font-medium">링크</th>
            <th className="px-4 py-3 font-medium">관리</th>
          </tr>
        </thead>
        <tbody>
          {invites.map((invite) => (
            <tr
              key={invite.id}
              className="border-b border-[var(--rm-border)] last:border-0"
            >
              <td className="px-4 py-3">
                <p className="font-mono text-xs">{invite.academyCode}</p>
                {invite.academyNameHint ? (
                  <p className="text-xs text-[var(--rm-text-muted)]">
                    {invite.academyNameHint}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-xs">
                <span className="font-medium uppercase">
                  {invite.planCode || "basic"}
                </span>
                <span className="block text-[var(--rm-text-faint)]">
                  {formatKrw(invite.pricePerStudentKrw)}/명
                </span>
              </td>
              <td className="px-4 py-3 text-xs">
                {STATUS_LABEL[invite.status]}
              </td>
              <td className="px-4 py-3">
                <InviteCopyButton
                  token={invite.token}
                  disabled={invite.status !== "pending"}
                />
              </td>
              <td className="px-4 py-3">
                {invite.status === "pending" ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await revokeInviteAction(invite.id);
                      })
                    }
                    className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    취소
                  </button>
                ) : (
                  <span className="text-xs text-[var(--rm-text-faint)]">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
