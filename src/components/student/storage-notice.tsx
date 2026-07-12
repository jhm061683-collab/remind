"use client";

import { useEffect, useState } from "react";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { isLocalStorageAvailable } from "@/lib/storage/safe-storage";

/** 저장이 막힌 경우에만 경고. 클라우드 모드 안내는 더 이상 표시하지 않음. */
export function StorageNotice() {
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (isSupabaseEnabled()) return;
    if (!isLocalStorageAvailable()) setShowError(true);
  }, []);

  if (!showError) return null;

  return (
    <div className="rm-storage-notice rm-storage-notice--error mb-2 rounded-xl border px-3 py-2 text-sm leading-relaxed">
      ⚠ 브라우저 저장이 막혀 있습니다. 시크릿 모드 해제 또는 저장 허용 후
      새로고침해 주세요.
    </div>
  );
}
