"use client";

import { useTransition } from "react";
import { updateAcademyStatusAction } from "@/lib/actions/platform";
import type { PlatformAcademyRow } from "@/lib/server/platform/queries";

const STATUS_LABEL: Record<PlatformAcademyRow["status"], string> = {
  active: "운영",
  trial: "체험",
  suspended: "정지",
};

export function AcademyStatusActions({
  academyId,
  status,
}: {
  academyId: string;
  status: PlatformAcademyRow["status"];
}) {
  const [pending, startTransition] = useTransition();

  function setStatus(next: PlatformAcademyRow["status"]) {
    startTransition(async () => {
      await updateAcademyStatusAction(academyId, next);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "active" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => setStatus("active")}
          className="rounded-lg border border-[var(--rm-border)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--rm-surface-raised)] disabled:opacity-50"
        >
          운영으로
        </button>
      ) : null}
      {status !== "suspended" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => setStatus("suspended")}
          className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          정지
        </button>
      ) : null}
      {status !== "trial" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => setStatus("trial")}
          className="rounded-lg border border-[var(--rm-border)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--rm-surface-raised)] disabled:opacity-50"
        >
          체험으로
        </button>
      ) : null}
      <span className="self-center text-xs text-[var(--rm-text-muted)]">
        현재: {STATUS_LABEL[status]}
      </span>
    </div>
  );
}
