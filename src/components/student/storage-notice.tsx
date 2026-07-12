"use client";

import { useEffect, useState } from "react";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { isLocalStorageAvailable } from "@/lib/storage/safe-storage";

export function StorageNotice() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isSupabaseEnabled()) {
      setMessage("☁️ 클라우드 저장 모드 — PC와 폰에서 같은 데이터를 사용합니다.");
      return;
    }
    if (!isLocalStorageAvailable()) {
      setMessage(
        "⚠ 브라우저 저장이 막혀 있습니다. 시크릿 모드 해제 또는 저장 허용 후 새로고침해 주세요.",
      );
    }
  }, []);

  if (!message) return null;

  const isError = message.startsWith("⚠");

  return (
    <div
      className={`rm-storage-notice mb-2 rounded-xl border px-3 py-2 text-sm leading-relaxed ${
        isError ? "rm-storage-notice--error" : "rm-storage-notice--info"
      }`}
    >
      {message}
    </div>
  );
}
