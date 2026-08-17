"use client";

import { useEffect, useTransition } from "react";
import { markNotificationsReadAction } from "@/lib/actions/student-notifications";
import type { StudentNotificationRow } from "@/lib/server/student/notifications";

type Props = {
  items: StudentNotificationRow[];
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function StudentNotificationsPanel({ items }: Props) {
  const [, startTransition] = useTransition();

  useEffect(() => {
    const unread = items.filter((i) => !i.isRead).map((i) => i.id);
    if (unread.length === 0) return;
    startTransition(async () => {
      await markNotificationsReadAction(unread);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 최초 진입 시에만 읽음 처리
  }, []);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--rm-border)] bg-[var(--rm-surface)]/60 p-8 text-center">
        <p className="text-sm text-[var(--rm-text-muted)]">
          아직 받은 알림이 없어요.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className={`rounded-2xl border border-[var(--rm-border)] p-4 ${
            item.isRead
              ? "bg-[var(--rm-surface)]/70"
              : "bg-[var(--rm-surface)] shadow-sm"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--rm-text)]">
                {item.title}
              </p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-[var(--rm-text-muted)]">
                {item.body}
              </p>
            </div>
            {!item.isRead ? (
              <span className="mt-0.5 shrink-0 rounded-full bg-[var(--rm-accent,#2563eb)] px-2 py-0.5 text-[10px] font-bold text-white">
                NEW
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-[11px] text-[var(--rm-text-faint)]">
            {formatWhen(item.createdAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}
