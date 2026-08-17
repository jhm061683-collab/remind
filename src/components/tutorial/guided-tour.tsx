"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { TourOverlay } from "@/components/tutorial/tour-overlay";
import {
  findTourTarget,
  getViewportBox,
  measureElementRect,
  scrollTargetIntoView,
  waitForTourTarget,
} from "@/components/tutorial/find-target";
import {
  inflateRect,
  placeTooltip,
  type PlacedTooltip,
  type Rect,
} from "@/lib/tutorial/geometry";
import { lockPageScroll } from "@/lib/tutorial/scroll-lock";
import type { TourRunMode, TutorialDefinition } from "@/lib/tutorial/types";

type Props = {
  tutorial: TutorialDefinition;
  mode: TourRunMode;
  onDismiss: (opts: { hide: boolean }) => void;
};

const PAD = 4;
const ESTIMATED_CARD_HEIGHT = 210;

export function GuidedTour({ tutorial, onDismiss }: Props) {
  const liveId = useId();
  const [stepIndex, setStepIndex] = useState(0);
  const [hole, setHole] = useState<Rect | null>(null);
  const [radius, setRadius] = useState(12);
  const [hideChecked, setHideChecked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [cardHeight, setCardHeight] = useState(ESTIMATED_CARD_HEIGHT);
  const [locating, setLocating] = useState(true);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const dialogRootRef = useRef<HTMLDivElement>(null);
  const unlockRef = useRef<(() => void) | null>(null);
  const skipWarned = useRef(new Set<string>());
  const measuringRef = useRef(false);

  const step = tutorial.steps[stepIndex];

  const releaseLock = useCallback(() => {
    unlockRef.current?.();
    unlockRef.current = null;
  }, []);

  const applyLock = useCallback(() => {
    if (unlockRef.current) return;
    unlockRef.current = lockPageScroll();
  }, []);

  const measure = useCallback(
    async (index: number, timeoutMs = 800) => {
      const current = tutorial.steps[index];
      if (!current) return false;
      measuringRef.current = true;
      releaseLock();

      const existing = findTourTarget(current.target);
      const el = existing ?? (await waitForTourTarget(current.target, timeoutMs));
      if (!el) {
        if (
          process.env.NODE_ENV !== "production" &&
          !skipWarned.current.has(current.target)
        ) {
          skipWarned.current.add(current.target);
          console.warn(`missing tour target: ${current.target}`);
        }
        measuringRef.current = false;
        return false;
      }

      await scrollTargetIntoView(el, {
        top: 16,
        bottom: Math.min(240, Math.round(window.innerHeight * 0.38)),
      });
      await waitFrames(2);
      applyLock();
      await waitFrames(1);

      const located = findTourTarget(current.target) ?? el;
      const rect = measureElementRect(located);
      const inflated = inflateRect(rect, PAD);
      const style = window.getComputedStyle(located);
      const parsed = Number.parseFloat(style.borderRadius);
      setRadius(
        Number.isFinite(parsed) && parsed > 0
          ? Math.min(Math.max(parsed, 8), 20)
          : 12,
      );
      setHole(inflated);
      setIsMobile(window.matchMedia("(max-width: 767px)").matches);
      setLocating(false);
      measuringRef.current = false;
      return true;
    },
    [applyLock, releaseLock, tutorial.steps],
  );

  const skipToAvailable = useCallback(
    async (from: number, direction: 1 | -1 | 0) => {
      const start = direction === 0 ? from : from + direction;
      const stepDir = direction === 0 ? 1 : direction;
      let index = start;
      while (index >= 0 && index < tutorial.steps.length) {
        if (findTourTarget(tutorial.steps[index]!.target)) {
          const ok = await measure(index, 200);
          if (ok) {
            setStepIndex(index);
            return true;
          }
        }
        index += stepDir;
      }
      index = start;
      while (index >= 0 && index < tutorial.steps.length) {
        const ok = await measure(index, 900);
        if (ok) {
          setStepIndex(index);
          return true;
        }
        index += stepDir;
      }
      if (direction === 0 && from > 0) {
        return skipToAvailable(from, -1);
      }
      return false;
    },
    [measure, tutorial.steps],
  );

  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    let cancelled = false;
    setLocating(true);
    void (async () => {
      const ok = await skipToAvailable(0, 0);
      if (!ok && !cancelled) dismissRef.current({ hide: false });
    })();
    return () => {
      cancelled = true;
      releaseLock();
    };
  }, [releaseLock, skipToAvailable, tutorial.key]);

  useEffect(() => {
    if (!hole) return;
    const refresh = () => {
      if (measuringRef.current) return;
      const current = tutorial.steps[stepIndex];
      const el = current ? findTourTarget(current.target) : null;
      if (!el) return;
      setHole(inflateRect(measureElementRect(el), PAD));
    };
    window.addEventListener("resize", refresh);
    window.addEventListener("orientationchange", refresh);
    window.visualViewport?.addEventListener("resize", refresh);
    const ro = new ResizeObserver(refresh);
    const current = tutorial.steps[stepIndex];
    const el = current ? findTourTarget(current.target) : null;
    if (el) ro.observe(el);
    return () => {
      window.removeEventListener("resize", refresh);
      window.removeEventListener("orientationchange", refresh);
      window.visualViewport?.removeEventListener("resize", refresh);
      ro.disconnect();
    };
  }, [hole, stepIndex, tutorial.steps]);

  useEffect(() => {
    const node = tooltipRef.current;
    if (!node) return;
    const update = () => {
      const next = Math.ceil(node.getBoundingClientRect().height);
      if (next > 80 && Math.abs(next - cardHeight) > 4) {
        setCardHeight(next);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, [cardHeight, stepIndex, hole]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismissRef.current({ hide: hideChecked });
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        void go(1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        void go(-1);
      }
      if (event.key === "Tab") {
        const root = tooltipRef.current ?? dialogRootRef.current;
        if (!root) return;
        const nodes = [
          ...root.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])',
          ),
        ].filter((node) => !node.hasAttribute("disabled"));
        if (nodes.length === 0) return;
        const first = nodes[0]!;
        const last = nodes[nodes.length - 1]!;
        const active = document.activeElement;
        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        } else if (!root.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    tooltipRef.current?.querySelector<HTMLElement>("button, input")?.focus();
  }, [stepIndex, locating]);

  async function go(direction: 1 | -1) {
    if (direction === 1 && stepIndex >= tutorial.steps.length - 1) {
      onDismiss({ hide: hideChecked });
      return;
    }
    setLocating(true);
    const ok = await skipToAvailable(stepIndex, direction);
    if (!ok && direction === 1) onDismiss({ hide: hideChecked });
    if (!ok) setLocating(false);
  }

  const viewport =
    typeof window === "undefined"
      ? { width: 390, height: 700, offsetTop: 0, offsetLeft: 0 }
      : getViewportBox();
  const tooltipWidth = isMobile ? Math.min(360, viewport.width - 24) : 320;
  const placed: PlacedTooltip | null = hole
    ? placeTooltip({
        target: hole,
        viewport,
        tooltipWidth,
        tooltipHeight: cardHeight,
        isMobile,
      })
    : null;

  return (
    <div ref={dialogRootRef}>
      <span id={liveId} className="sr-only" aria-live="polite">
        {step?.title ?? ""}
      </span>
      <TourOverlay
        hole={hole}
        radius={radius}
        tooltip={placed}
        tipIndex={stepIndex + 1}
        tipTotal={tutorial.steps.length}
        title={step?.title ?? ""}
        description={step?.description ?? ""}
        hideChecked={hideChecked}
        isFirst={stepIndex === 0}
        isLast={stepIndex === tutorial.steps.length - 1}
        allowInteraction={Boolean(step?.allowInteraction)}
        locating={locating && !hole}
        tooltipRef={tooltipRef}
        onHideCheckedChange={setHideChecked}
        onPrev={() => void go(-1)}
        onNext={() => void go(1)}
        onClose={() => onDismiss({ hide: hideChecked })}
      />
    </div>
  );
}

function waitFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    const tick = (left: number) => {
      if (left <= 0) {
        resolve();
        return;
      }
      requestAnimationFrame(() => tick(left - 1));
    };
    tick(count);
  });
}
