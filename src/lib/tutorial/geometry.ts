export type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
};

export type ViewportBox = {
  width: number;
  height: number;
  offsetTop: number;
  offsetLeft: number;
};

export type TooltipPlacement = "above" | "below" | "left" | "right";

export type PlacedTooltip = {
  x: number;
  y: number;
  width: number;
  placement: TooltipPlacement;
};

const EDGE = 12;
const GAP = 10;

export function inflateRect(rect: Rect, pad: number): Rect {
  return {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
    bottom: rect.bottom + pad,
    right: rect.right + pad,
  };
}

export function isRectInViewport(rect: Rect, viewport: ViewportBox, margin = 8): boolean {
  const top = viewport.offsetTop + margin;
  const left = viewport.offsetLeft + margin;
  const bottom = viewport.offsetTop + viewport.height - margin;
  const right = viewport.offsetLeft + viewport.width - margin;
  return (
    rect.top >= top &&
    rect.left >= left &&
    rect.bottom <= bottom &&
    rect.right <= right
  );
}

export function isMostlyVisible(rect: Rect, viewport: ViewportBox): boolean {
  const visTop = viewport.offsetTop;
  const visLeft = viewport.offsetLeft;
  const visBottom = visTop + viewport.height;
  const visRight = visLeft + viewport.width;
  const visibleHeight = Math.min(rect.bottom, visBottom) - Math.max(rect.top, visTop);
  const visibleWidth = Math.min(rect.right, visRight) - Math.max(rect.left, visLeft);
  return visibleHeight > 24 && visibleWidth > 24;
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * target 바로 옆/위/아래에 붙인다. 공간이 없으면 화면 안으로만 살짝 민다.
 */
export function placeTooltip(input: {
  target: Rect;
  viewport: ViewportBox;
  tooltipWidth: number;
  tooltipHeight: number;
  isMobile: boolean;
}): PlacedTooltip {
  const { target, viewport, tooltipHeight, isMobile } = input;
  const visLeft = viewport.offsetLeft;
  const visTop = viewport.offsetTop;
  const visRight = visLeft + viewport.width;
  const visBottom = visTop + viewport.height;

  const width = Math.min(
    input.tooltipWidth,
    Math.max(240, viewport.width - EDGE * 2),
  );
  const height = Math.min(tooltipHeight, Math.max(120, viewport.height - EDGE * 2));

  const spaceAbove = target.top - visTop - EDGE;
  const spaceBelow = visBottom - target.bottom - EDGE;

  const fitsBelow = target.bottom + GAP + height <= visBottom - EDGE;
  const fitsAbove = target.top - GAP - height >= visTop + EDGE;
  const fitsRight = !isMobile && target.right + GAP + width <= visRight - EDGE;
  const fitsLeft = !isMobile && target.left - GAP - width >= visLeft + EDGE;

  let placement: TooltipPlacement;
  if (fitsBelow) {
    placement = "below";
  } else if (fitsAbove) {
    placement = "above";
  } else if (fitsRight) {
    placement = "right";
  } else if (fitsLeft) {
    placement = "left";
  } else if (spaceBelow >= spaceAbove) {
    placement = "below";
  } else {
    placement = "above";
  }

  let x: number;
  let y: number;

  if (placement === "below") {
    x = clamp(
      target.left + target.width / 2 - width / 2,
      visLeft + EDGE,
      visRight - width - EDGE,
    );
    y = clamp(target.bottom + GAP, visTop + EDGE, visBottom - height - EDGE);
  } else if (placement === "above") {
    x = clamp(
      target.left + target.width / 2 - width / 2,
      visLeft + EDGE,
      visRight - width - EDGE,
    );
    y = clamp(target.top - GAP - height, visTop + EDGE, visBottom - height - EDGE);
  } else if (placement === "right") {
    x = clamp(target.right + GAP, visLeft + EDGE, visRight - width - EDGE);
    y = clamp(
      target.top + target.height / 2 - height / 2,
      visTop + EDGE,
      visBottom - height - EDGE,
    );
  } else {
    x = clamp(target.left - GAP - width, visLeft + EDGE, visRight - width - EDGE);
    y = clamp(
      target.top + target.height / 2 - height / 2,
      visTop + EDGE,
      visBottom - height - EDGE,
    );
  }

  return { x, y, width, placement };
}

export function nextAvailableIndex(
  current: number,
  missing: boolean[],
  direction: 1 | -1,
): number | null {
  let index = current + direction;
  while (index >= 0 && index < missing.length) {
    if (!missing[index]) return index;
    index += direction;
  }
  return null;
}

export function firstAvailableIndex(missing: boolean[]): number | null {
  const index = missing.findIndex((isMissing) => !isMissing);
  return index >= 0 ? index : null;
}
