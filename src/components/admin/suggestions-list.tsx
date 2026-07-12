"use client";

import { useEffect, useState } from "react";
import { listSuggestionsForAdminAction } from "@/lib/actions/suggestions";
import type { StoredSuggestion } from "@/lib/types/suggestions";
import { formatDate } from "@/lib/utils/labels";

export function AdminSuggestionsList() {
  const [items, setItems] = useState<StoredSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listSuggestionsForAdminAction().then((result) => {
      if (result.error) setError(result.error);
      else setItems(result.items ?? []);
      setLoading(false);
    });
  }, []);

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
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
            <span className="font-semibold text-zinc-800">{item.userName}</span>
            <span>{formatDate(item.createdAt)}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
            {item.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
