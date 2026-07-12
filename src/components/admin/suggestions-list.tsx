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
    return <p className="text-sm text-zinc-500">불러오는 중...</p>;
  }

  if (error) {
    return (
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {error}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
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
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
          이 조건에 맞는 건의가 없어요.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => (
            <li
              key={item.id}
              className={`rounded-2xl border px-4 py-3 shadow-sm ${
                item.isRead
                  ? "border-zinc-200 bg-white"
                  : "border-blue-200 bg-blue-50/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span className="font-semibold text-zinc-800">
                      {item.userName}
                    </span>
                    <span>{formatDate(item.createdAt)}</span>
                    {!item.isRead ? (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        NEW
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
                    {item.body}
                  </p>
                </div>
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-xs font-semibold text-zinc-700">
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
