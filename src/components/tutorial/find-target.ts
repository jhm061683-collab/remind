import { isElementScrollable } from "@/lib/tutorial/scroll-lock";

export function findTourTarget(id: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const selector = `[data-tour-id="${cssEscape(id)}"]`;
  const nodes = document.querySelectorAll(selector);
  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue;
    if (!isTargetVisible(node)) continue;
    return node;
  }
  return null;
}

export function isTargetVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (Number(style.opacity) === 0) return false;
  const rect = el.getBoundingClientRect();
  return rect.width >= 2 && rect.height >= 2;
}

export function waitForTourTarget(
  id: string,
  timeoutMs = 2800,
): Promise<HTMLElement | null> {
  const immediate = findTourTarget(id);
  if (immediate) return Promise.resolve(immediate);

  return new Promise((resolve) => {
    let finished = false;
    let raf = 0;

    const finish = (el: HTMLElement | null) => {
      if (finished) return;
      finished = true;
      observer.disconnect();
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      resolve(el);
    };

    const observer = new MutationObserver(() => {
      const el = findTourTarget(id);
      if (el) finish(el);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-tour-id", "class", "style"],
    });

    let frames = 0;
    const tick = () => {
      frames += 1;
      const el = findTourTarget(id);
      if (el) {
        finish(el);
        return;
      }
      if (frames < 24) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const timer = window.setTimeout(() => finish(findTourTarget(id)), timeoutMs);
  });
}

export function measureElementRect(el: HTMLElement): {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
} {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    bottom: rect.bottom,
    right: rect.right,
  };
}

export async function scrollTargetIntoView(
  el: HTMLElement,
  reserve = { top: 16, bottom: 220 },
): Promise<void> {
  const viewport = getViewportBox();
  const visTop = viewport.offsetTop;
  const visBottom = visTop + viewport.height;
  const band = visBottom - visTop - reserve.top - reserve.bottom;
  const rect = el.getBoundingClientRect();

  if (rect.height <= Math.max(48, band)) {
    const desiredTop = visTop + reserve.top;
    const desiredBottom = visBottom - reserve.bottom;
    let delta = 0;
    if (rect.bottom > desiredBottom) delta += rect.bottom - desiredBottom;
    if (rect.top - delta < desiredTop) delta = rect.top - desiredTop;
    if (Math.abs(delta) > 2) {
      scrollByDelta(el, delta);
      await waitForScrollSettle();
    }
    return;
  }

  const delta = rect.top - (visTop + reserve.top);
  if (Math.abs(delta) > 2) {
    scrollByDelta(el, delta);
    await waitForScrollSettle();
  }
}

function scrollByDelta(el: HTMLElement, delta: number): void {
  let remaining = delta;
  let node: HTMLElement | null = el.parentElement;
  while (node && Math.abs(remaining) > 1) {
    if (isElementScrollable(node)) {
      const before = node.scrollTop;
      node.scrollTop += remaining;
      remaining -= node.scrollTop - before;
    }
    node = node.parentElement;
  }
  if (Math.abs(remaining) > 1) {
    window.scrollBy(0, remaining);
  }
}

export function getViewportBox(): {
  width: number;
  height: number;
  offsetTop: number;
  offsetLeft: number;
} {
  const vv = window.visualViewport;
  return {
    width: vv?.width ?? window.innerWidth,
    height: vv?.height ?? window.innerHeight,
    offsetTop: vv?.offsetTop ?? 0,
    offsetLeft: vv?.offsetLeft ?? 0,
  };
}

function waitForScrollSettle(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener("scrollend", finish);
      window.clearTimeout(fallback);
      window.setTimeout(resolve, 40);
    };
    window.addEventListener("scrollend", finish, { once: true });
    const fallback = window.setTimeout(finish, 80);
  });
}

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/"/g, '\\"');
}
