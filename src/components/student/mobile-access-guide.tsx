"use client";

import { useEffect, useState } from "react";

export function MobileAccessGuide() {
  const [urls, setUrls] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/network-info")
      .then((res) => res.json())
      .then((data: { urls?: string[] }) => setUrls(data.urls ?? []))
      .catch(() => setUrls([]));
  }, []);

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  }

  if (urls.length === 0) return null;

  return (
    <section className="rounded-2xl border border-violet-100 bg-violet-50/50 p-3 text-sm text-violet-900">
      <p className="text-xs font-semibold">스마트폰에서 열기</p>
      <p className="mt-1 text-[11px] text-violet-700/80">
        같은 Wi‑Fi · 아래 주소 복사
      </p>
      <ul className="mt-3 space-y-2">
        {urls.map((url) => (
          <li key={url}>
            <button
              type="button"
              onClick={() => copyUrl(url)}
              className="w-full rounded-lg bg-white px-3 py-2 text-left font-mono text-xs text-violet-700 ring-1 ring-violet-200"
            >
              {url}
              {copied === url ? " ✓ 복사됨" : " (탭해서 복사)"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
