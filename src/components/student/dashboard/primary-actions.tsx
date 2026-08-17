"use client";

import Link from "next/link";
import { IconChevronRight, IconPlusPhoto, IconStudy } from "@/components/ui/icons";
import { UI_LABELS } from "@/lib/constants/ui-labels";

type Props = {
  todayCount: number;
  loading?: boolean;
};

export function PrimaryActions({ todayCount, loading }: Props) {
  const hasToday = !loading && todayCount > 0;
  const emptyToday = !loading && todayCount === 0;

  return (
    <section className="grid grid-cols-2 gap-2">
      <Link
        href="/upload"
        prefetch
        className="rm-action-card rm-action-card--register group touch-manipulation active:opacity-90"
      >
        <span className="rm-action-card__icon">
          <IconPlusPhoto size={20} />
        </span>
        <span className="rm-action-card__body">
          <span className="rm-action-card__eyebrow">{UI_LABELS.registerTab}</span>
          <span className="rm-action-card__title">{UI_LABELS.registerCtaTitle}</span>
        </span>
        <IconChevronRight
          size={14}
          className="rm-action-card__chevron hidden shrink-0 opacity-60 transition group-hover:opacity-100 sm:block"
        />
      </Link>

      <Link
        href="/study/today"
        prefetch
        className="rm-action-card rm-action-card--study group touch-manipulation active:opacity-90"
        title={
          emptyToday
            ? "오늘은 할 문제가 없어요. 예정·등록으로 이어져요."
            : undefined
        }
      >
        <span className="rm-action-card__icon rm-action-card__icon--study">
          <IconStudy size={20} />
        </span>
        <span className="rm-action-card__body">
          <span className="rm-action-card__eyebrow">{UI_LABELS.studyTab}</span>
          <span className="rm-action-card__title">
            {emptyToday ? UI_LABELS.todayQueueEmptyCta : UI_LABELS.todayQueueCta}
          </span>
        </span>
        {hasToday ? (
          <span className="rm-action-card__badge">{todayCount}</span>
        ) : (
          <IconChevronRight
            size={14}
            className="rm-action-card__chevron hidden shrink-0 opacity-60 transition group-hover:opacity-100 sm:block"
          />
        )}
      </Link>
    </section>
  );
}
