"use client";

import Link from "next/link";
import { IconChevronRight, IconPlusPhoto, IconStudy } from "@/components/ui/icons";
import { UI_LABELS } from "@/lib/constants/ui-labels";

type Props = {
  todayCount: number;
  loading?: boolean;
};

export function PrimaryActions({ todayCount, loading }: Props) {
  const studyDisabled = !loading && todayCount === 0;

  return (
    <section className="grid grid-cols-2 gap-2">
      <Link href="/upload" className="rm-action-card rm-action-card--register group">
        <span className="rm-action-card__icon">
          <IconPlusPhoto size={20} />
        </span>
        <span className="rm-action-card__body">
          <span className="rm-action-card__eyebrow">{UI_LABELS.registerTab}</span>
          <span className="rm-action-card__title">사진 올리기</span>
        </span>
        <IconChevronRight
          size={14}
          className="rm-action-card__chevron hidden shrink-0 opacity-60 transition group-hover:opacity-100 sm:block"
        />
      </Link>

      <Link
        href="/study/today"
        className={`rm-action-card rm-action-card--study group ${studyDisabled ? "rm-action-card--disabled" : ""}`}
        aria-disabled={studyDisabled}
        onClick={studyDisabled ? (e) => e.preventDefault() : undefined}
      >
        <span className="rm-action-card__icon rm-action-card__icon--study">
          <IconStudy size={20} />
        </span>
        <span className="rm-action-card__body">
          <span className="rm-action-card__eyebrow">{UI_LABELS.studyTab}</span>
          <span className="rm-action-card__title">시작</span>
        </span>
        {!loading && todayCount > 0 ? (
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
