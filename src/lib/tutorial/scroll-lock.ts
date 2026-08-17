type LockedStyle = {
  el: HTMLElement;
  overflow: string;
  overflowX: string;
  overflowY: string;
  overscroll: string;
  webkitOverflowScrolling: string;
};

type LockSnapshot = {
  htmlOverflow: string;
  htmlOverscroll: string;
  bodyOverflow: string;
  bodyOverscroll: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
  bodyPaddingRight: string;
  bodyTouchAction: string;
  htmlTouchAction: string;
  scrollX: number;
  scrollY: number;
  nested: LockedStyle[];
};

export function isElementScrollable(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  const y = style.overflowY;
  const x = style.overflowX;
  const canY =
    (y === "auto" || y === "scroll" || y === "overlay") &&
    el.scrollHeight > el.clientHeight + 1;
  const canX =
    (x === "auto" || x === "scroll" || x === "overlay") &&
    el.scrollWidth > el.clientWidth + 1;
  return canY || canX;
}

function collectScrollContainers(): HTMLElement[] {
  const found: HTMLElement[] = [];
  const nodes = document.querySelectorAll("body *");
  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.closest("[data-tour-root]")) continue;
    if (isElementScrollable(node)) found.push(node);
  }
  return found;
}

export function findTourDialog(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  return target.closest("[data-tour-dialog]");
}

/**
 * iOS는 스크롤 가능한 자식이 끝에 닿으면 배경으로 스크롤이 전달된다.
 * 그 체인만 막아 고무줄 바운스를 끊는다.
 * deltaY > 0 은 손가락이 아래로 (scrollTop 감소).
 */
export function shouldPreventTouchMove(
  dialog: HTMLElement | null,
  deltaY: number,
): boolean {
  if (!dialog) return true;
  const max = dialog.scrollHeight - dialog.clientHeight;
  if (max <= 1) return true;
  if (deltaY > 0 && dialog.scrollTop <= 0) return true;
  if (deltaY < 0 && dialog.scrollTop >= max - 1) return true;
  return false;
}

/**
 * iOS Safari 포함: overflow:hidden 만으로는 바운스가 남는다.
 * body를 fixed로 고정하고, 배경 touchmove는 preventDefault 한다.
 */
export function lockPageScroll(): () => void {
  const html = document.documentElement;
  const body = document.body;
  const scrollbarGap = Math.max(0, window.innerWidth - html.clientWidth);
  const snapshot: LockSnapshot = {
    htmlOverflow: html.style.overflow,
    htmlOverscroll: html.style.overscrollBehavior,
    bodyOverflow: body.style.overflow,
    bodyOverscroll: body.style.overscrollBehavior,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    bodyWidth: body.style.width,
    bodyPaddingRight: body.style.paddingRight,
    bodyTouchAction: body.style.touchAction,
    htmlTouchAction: html.style.touchAction,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    nested: collectScrollContainers().map((el) => ({
      el,
      overflow: el.style.overflow,
      overflowX: el.style.overflowX,
      overflowY: el.style.overflowY,
      overscroll: el.style.overscrollBehavior,
      webkitOverflowScrolling: el.style.getPropertyValue(
        "-webkit-overflow-scrolling",
      ),
    })),
  };

  html.classList.add("tour-scroll-lock");
  html.style.overflow = "hidden";
  html.style.overscrollBehavior = "none";
  html.style.touchAction = "none";
  body.style.overflow = "hidden";
  body.style.overscrollBehavior = "none";
  body.style.position = "fixed";
  body.style.top = `-${snapshot.scrollY}px`;
  body.style.left = `-${snapshot.scrollX}px`;
  body.style.right = "0px";
  body.style.width = "100%";
  body.style.touchAction = "none";
  if (scrollbarGap > 0) {
    body.style.paddingRight = `${scrollbarGap}px`;
  }

  for (const item of snapshot.nested) {
    item.el.style.overflow = "hidden";
    item.el.style.overscrollBehavior = "none";
    item.el.style.setProperty("-webkit-overflow-scrolling", "auto");
  }

  let lastY = 0;
  const onTouchStart = (event: TouchEvent) => {
    lastY = event.touches[0]?.clientY ?? 0;
  };
  const onTouchMove = (event: TouchEvent) => {
    const y = event.touches[0]?.clientY ?? lastY;
    const deltaY = y - lastY;
    lastY = y;
    const dialog = findTourDialog(event.target);
    if (!shouldPreventTouchMove(dialog, deltaY)) return;
    event.preventDefault();
  };
  const onWheel = (event: WheelEvent) => {
    const dialog = findTourDialog(event.target);
    if (!shouldPreventTouchMove(dialog, -event.deltaY)) {
      return;
    }
    event.preventDefault();
  };
  const onKey = (event: KeyboardEvent) => {
    if (findTourDialog(event.target)) return;
    const blockKeys = new Set([
      " ",
      "PageUp",
      "PageDown",
      "Home",
      "End",
      "ArrowUp",
      "ArrowDown",
    ]);
    if (blockKeys.has(event.key)) event.preventDefault();
  };
  const pinWindow = () => {
    if (window.scrollX !== 0 || window.scrollY !== 0) {
      window.scrollTo(0, 0);
    }
  };

  window.addEventListener("touchstart", onTouchStart, {
    passive: true,
    capture: true,
  });
  window.addEventListener("touchmove", onTouchMove, {
    passive: false,
    capture: true,
  });
  window.addEventListener("wheel", onWheel, { passive: false, capture: true });
  window.addEventListener("keydown", onKey, { capture: true });
  window.addEventListener("scroll", pinWindow, { passive: true, capture: true });
  window.visualViewport?.addEventListener("scroll", pinWindow);

  let released = false;
  return () => {
    if (released) return;
    released = true;
    window.removeEventListener("touchstart", onTouchStart, true);
    window.removeEventListener("touchmove", onTouchMove, true);
    window.removeEventListener("wheel", onWheel, true);
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("scroll", pinWindow, true);
    window.visualViewport?.removeEventListener("scroll", pinWindow);

    html.classList.remove("tour-scroll-lock");
    html.style.overflow = snapshot.htmlOverflow;
    html.style.overscrollBehavior = snapshot.htmlOverscroll;
    html.style.touchAction = snapshot.htmlTouchAction;
    body.style.overflow = snapshot.bodyOverflow;
    body.style.overscrollBehavior = snapshot.bodyOverscroll;
    body.style.position = snapshot.bodyPosition;
    body.style.top = snapshot.bodyTop;
    body.style.left = snapshot.bodyLeft;
    body.style.right = snapshot.bodyRight;
    body.style.width = snapshot.bodyWidth;
    body.style.paddingRight = snapshot.bodyPaddingRight;
    body.style.touchAction = snapshot.bodyTouchAction;

    for (const item of snapshot.nested) {
      item.el.style.overflow = item.overflow;
      item.el.style.overflowX = item.overflowX;
      item.el.style.overflowY = item.overflowY;
      item.el.style.overscrollBehavior = item.overscroll;
      if (item.webkitOverflowScrolling) {
        item.el.style.setProperty(
          "-webkit-overflow-scrolling",
          item.webkitOverflowScrolling,
        );
      } else {
        item.el.style.removeProperty("-webkit-overflow-scrolling");
      }
    }

    window.scrollTo(snapshot.scrollX, snapshot.scrollY);
  };
}
