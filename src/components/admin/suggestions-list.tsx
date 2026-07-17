"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  listSuggestionsForAdminAction,
  setSuggestionReadAction,
} from "@/lib/actions/suggestions";
import type { StoredSuggestion } from "@/lib/types/suggestions";
import { formatDate } from "@/lib/utils/labels";

type Filter = "all" | "unread" | "read";

export function AdminSuggestionsList() {
  const [items, setItems] = useState<StoredSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void listSuggestionsForAdminAction().then((result) => {
      if (result.error) setError(result.error);
      else setItems(result.items ?? []);
      setLoading(false);
    });
  }, []);

  const unreadCount = useMemo(
    () => items.filter((i) => !i.isRead).length,
    [items],
  );

  const visible = useMemo(() => {
    if (filter === "unread") return items.filter((i) => !i.isRead);
    if (filter === "read") return items.filter((i) => i.isRead);
    return items;
  }, [items, filter]);

  function toggleRead(item: StoredSuggestion) {
    const next = !item.isRead;
    setPendingId(item.id);
    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, isRead: next } : row,
      ),
    );
    startTransition(async () => {
      const result = await setSuggestionReadAction(item.id, next);
      if (result.error) {
        setItems((prev) =>
          prev.map((row) =>
            row.id === item.id ? { ...row, isRead: item.isRead } : row,
          ),
        );
        window.alert(result.error);
      }
      setPendingId(null);
    });
  }

  if (loading) {
    return <p className="text-sm text-[var(--rm-text-muted)]">불러오는 중...</p>;
  }

  if (error) {
    return (
      <p className="rounded-xl bg-[color-mix(in_srgb,var(--rm-warning)_12%,var(--rm-surface))] px-4 py-3 text-sm text-[var(--rm-text)]">
        {error}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--rm-border)] bg-[var(--rm-surface-raised)] px-4 py-8 text-center text-sm text-[var(--rm-text-muted)]">
        아직 올라온 건의가 없어요.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: "all", label: `전체 ${items.length}` },
            { id: "unread", label: `안 읽음 ${unreadCount}` },
            { id: "read", label: `읽음 ${items.length - unreadCount}` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              filter === tab.id
                ? "bg-[var(--rm-text)] text-white"
                : "bg-[var(--rm-accent-muted)] text-[var(--rm-text-muted)] hover:bg-[var(--rm-surface-raised)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--rm-border)] bg-[var(--rm-surface-raised)] px-4 py-6 text-center text-sm text-[var(--rm-text-muted)]">
          이 조건에 맞는 건의가 없어요.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => (
            <li
              key={item.id}
              className={`rounded-2xl border px-4 py-3 shadow-sm ${
                item.isRead
                  ? "border-[var(--rm-border)] bg-[var(--rm-surface)]"
                  : "border-[var(--rm-info-border)] bg-[var(--rm-info-bg)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--rm-text-muted)]">
                    <span className="font-semibold text-[var(--rm-text)]">
                      {item.userName}
                    </span>
                    <span>{formatDate(item.createdAt)}</span>
                    {!item.isRead ? (
                      <span className="rounded-full bg-[var(--rm-brand)] px-2 py-0.5 text-[10px] font-bold text-white">
                        NEW
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--rm-text)]">
                    {item.body}
                  </p>
                </div>
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2.5 py-2 text-xs font-semibold text-[var(--rm-text)]">
                  <input
                    type="checkbox"
                    checked={item.isRead}
                    disabled={pending && pendingId === item.id}
                    onChange={() => toggleRead(item)}
                    className="h-4 w-4 accent-blue-600"
                  />
                  읽음
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
