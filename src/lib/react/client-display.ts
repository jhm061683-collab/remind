import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};
const LOCAL_STORAGE_EVENT = "remind-local-storage";

function subscribeLocalStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(LOCAL_STORAGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(LOCAL_STORAGE_EVENT, onStoreChange);
  };
}

/** SSR/hydration은 null, 마운트 후 localStorage 값을 읽는다. */
export function useLocalStorageItem(key: string): string | null {
  return useSyncExternalStore(
    subscribeLocalStorage,
    () => window.localStorage.getItem(key),
    () => null,
  );
}

export function writeLocalStorageItem(key: string, value: string | null) {
  if (value === null) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, value);
  window.dispatchEvent(new Event(LOCAL_STORAGE_EVENT));
}

/** 클라이언트 마운트 여부 — 포털/다이얼로그 SSR 가드용 */
export function useClientMounted(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** SSR과 hydration을 맞추기 위해 서버에서는 fallback만 반환한다. */
export function useClientFormattedDate(
  format: (date: Date) => string,
  fallback: string,
): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => format(new Date()),
    () => fallback,
  );
}

export function useClientClock(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string | null {
  return useSyncExternalStore(
    (onStoreChange) => {
      const id = window.setInterval(onStoreChange, 60_000);
      return () => window.clearInterval(id);
    },
    () => new Date().toLocaleTimeString(locale, options),
    () => null,
  );
}
