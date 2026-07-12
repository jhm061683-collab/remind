"use client";

import { useEffect, useState, useTransition } from "react";
import { submitSuggestionAction } from "@/lib/actions/suggestions";
import {
  addSuggestionLocal,
  listSuggestionsLocal,
} from "@/lib/storage/suggestions";
import type { StoredSuggestion } from "@/lib/types/suggestions";
import { formatDate } from "@/lib/utils/labels";

type Props = {
  userId: string;
  userName: string;
};

export function SuggestionForm({ userId, userName }: Props) {
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [mine, setMine] = useState<StoredSuggestion[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setMine(listSuggestionsLocal(userId));
  }, [userId]);

  function handleSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await submitSuggestionAction({}, formData);
      if (result.error === "LOCAL_FALLBACK") {
        const text = String(formData.get("body") ?? "").trim();
        if (text.length < 2) {
          setMessage({ type: "err", text: "건의 내용을 조금 더 적어 주세요." });
          return;
        }
        addSuggestionLocal({ userId, userName, body: text });
        setBody("");
        setMine(listSuggestionsLocal(userId));
        setMessage({ type: "ok", text: "건의를 저장했어요. (이 기기)" });
        return;
      }
      if (result.error) {
        setMessage({ type: "err", text: result.error });
        return;
      }
      setBody("");
      setMessage({
        type: "ok",
        text: result.success ?? "건의를 보냈어요. 감사합니다!",
      });
    });
  }

  return (
    <div className="space-y-6">
      <form action={handleSubmit} className="remind-card space-y-3 p-5">
        <label className="block">
          <span className="remind-field-label">건의 내용</span>
          <textarea
            name="body"
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="불편한 점, 있으면 좋을 기능 등을 자유롭게 적어 주세요."
            className="remind-input mt-1 text-base"
            maxLength={2000}
            required
          />
        </label>
        {message ? (
          <p
            className={`rounded-xl px-3 py-2 text-sm ${
              message.type === "ok"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending || body.trim().length < 2}
          className="min-h-12 w-full rounded-xl bg-blue-600 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? "보내는 중..." : "건의 보내기"}
        </button>
      </form>

      {mine.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">
            이 기기에 남긴 건의
          </p>
          <ul className="space-y-2">
            {mine.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700"
              >
                <p className="whitespace-pre-wrap">{item.body}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {formatDate(item.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
