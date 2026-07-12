export type StorageWriteResult =
  | { ok: true }
  | { ok: false; reason: "blocked" | "quota" | "unknown"; message: string };

export function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const probe = "__wrong_note_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): StorageWriteResult {
  if (typeof window === "undefined") {
    return {
      ok: false,
      reason: "blocked",
      message: "브라우저 저장소를 사용할 수 없습니다.",
    };
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" || error.code === 22)
    ) {
      return {
        ok: false,
        reason: "quota",
        message: "저장 공간이 부족합니다. 사진 크기를 줄이거나 오래된 문제를 삭제해 주세요.",
      };
    }
    return {
      ok: false,
      reason: "blocked",
      message:
        "브라우저가 저장을 막고 있습니다. 시크릿 모드 해제 또는 사이트 데이터 허용 후 다시 시도해 주세요.",
    };
  }
}

export function removeItem(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
