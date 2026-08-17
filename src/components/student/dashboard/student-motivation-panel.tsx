"use client";

import { useEffect, useMemo, useState } from "react";
import { StudentAvatarBadge } from "@/components/student/dashboard/student-avatar-badge";
import type {
  AcademyHallOfFame,
  AcademyMonthlyBoard,
  ClassRankSlice,
  HallOfFameClass,
  HallOfFamePerson,
  StudentRankCard,
} from "@/lib/server/rankings";

type Props = {
  rank: StudentRankCard | null;
  monthlyBoard: AcademyMonthlyBoard | null;
  hallOfFame: AcademyHallOfFame | null;
};

type BoardPeriod = "this" | "prev";

const LIST_PREVIEW = 10;

function RankPill({
  label,
  rank,
  total,
  sub,
}: {
  label: string;
  rank: number | null;
  total: number | null;
  sub?: string | null;
}) {
  if (rank == null || total == null || total <= 0) {
    return (
      <div className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-2.5 py-2">
        <p className="text-[10px] font-semibold text-[var(--rm-text-muted)]">
          {label}
        </p>
        {sub ? (
          <p className="mt-0.5 truncate text-[9px] text-[var(--rm-text-faint)]">
            {sub}
          </p>
        ) : null}
        <p className="mt-0.5 text-sm font-bold text-[var(--rm-text-faint)]">—</p>
      </div>
    );
  }
  const hot = rank <= 3;
  return (
    <div
      className={`rounded-xl border px-2.5 py-2 ${
        hot
          ? "border-[color-mix(in_srgb,var(--rm-brand)_35%,var(--rm-border))] bg-[color-mix(in_srgb,var(--rm-brand)_10%,var(--rm-surface))]"
          : "border-[var(--rm-border)] bg-[var(--rm-bg-elevated)]"
      }`}
    >
      <p className="text-[10px] font-semibold text-[var(--rm-text-muted)]">
        {label}
      </p>
      {sub ? (
        <p className="mt-0.5 truncate text-[9px] text-[var(--rm-text-faint)]">
          {sub}
        </p>
      ) : null}
      <p className="mt-0.5 text-sm font-extrabold tabular-nums text-[var(--rm-text)]">
        {rank}
        <span className="text-[11px] font-semibold text-[var(--rm-text-muted)]">
          위
        </span>
        <span className="ml-1 text-[10px] font-medium text-[var(--rm-text-faint)]">
          / {total}
        </span>
      </p>
    </div>
  );
}

function podiumTone(rank: number): string {
  if (rank === 1)
    return "border-[color-mix(in_srgb,#E8B923_50%,var(--rm-border))] bg-[color-mix(in_srgb,#E8B923_14%,var(--rm-surface))]";
  if (rank === 2)
    return "border-[color-mix(in_srgb,#9AA4B2_45%,var(--rm-border))] bg-[color-mix(in_srgb,#9AA4B2_12%,var(--rm-surface))]";
  return "border-[color-mix(in_srgb,#C47A4A_40%,var(--rm-border))] bg-[color-mix(in_srgb,#C47A4A_10%,var(--rm-surface))]";
}

function teacherLine(names: string[] | undefined): string | null {
  if (!names || names.length === 0) return null;
  return names.join(", ");
}

function nudgeCopy(rank: StudentRankCard): string {
  if (rank.academyRank === 1) {
    return "학원 1위예요. 학습 점수 페이스를 지키면 명예의 전당에 더 가까워져요!";
  }
  if (rank.academyRank <= 3) {
    return "학원 TOP 3! 복습을 조금만 더 하면 1위도 노려볼 수 있어요.";
  }
  if (rank.classRank != null && rank.classRank <= 3) {
    return "반 안에서는 상위권이에요. 학원 전체 학습 점수도 같이 올려 볼까요?";
  }
  if (rank.studyScore === 0 && rank.monthlyReviews === 0) {
    return "이번 달 복습을 시작하면 학습 점수가 바로 올라가요. 오늘 한 문제부터!";
  }
  if (rank.studyScore > 0) {
    return `이번 달 학습 점수 ${rank.studyScore}점 · 복습 ${rank.monthlyReviews}회. 조금만 더 하면 순위가 올라가요!`;
  }
  return `이번 달 복습 ${rank.monthlyReviews}회 · 조금만 더 하면 순위가 올라가요!`;
}

function ClassTabs({
  slices,
  selectedId,
  onSelect,
}: {
  slices: ClassRankSlice[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (slices.length <= 1) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-1">
      {slices.map((slice) => (
        <button
          key={slice.classId}
          type="button"
          onClick={() => onSelect(slice.classId)}
          className={`rounded-lg px-2 py-1 text-[11px] font-bold touch-manipulation ${
            selectedId === slice.classId
              ? "bg-[var(--rm-brand)] text-white"
              : "bg-[var(--rm-bg-elevated)] text-[var(--rm-text-muted)]"
          }`}
        >
          {slice.displayLabel || slice.className}
        </button>
      ))}
    </div>
  );
}

export function StudentMotivationPanel({
  rank,
  monthlyBoard,
  hallOfFame,
}: Props) {
  const classRanks = rank?.classRanks ?? [];
  const [selectedClassId, setSelectedClassId] = useState(
    classRanks[0]?.classId ?? "",
  );
  const [period, setPeriod] = useState<BoardPeriod>("this");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (classRanks.length === 0) return;
    if (!classRanks.some((c) => c.classId === selectedClassId)) {
      setSelectedClassId(classRanks[0]!.classId);
    }
  }, [classRanks, selectedClassId]);

  useEffect(() => {
    setShowAll(false);
  }, [period]);

  const activeSlice = useMemo(() => {
    if (classRanks.length === 0) return null;
    return (
      classRanks.find((c) => c.classId === selectedClassId) ?? classRanks[0]!
    );
  }, [classRanks, selectedClassId]);

  if (!rank && !monthlyBoard && !hallOfFame) return null;

  const levelLabel =
    rank?.schoolLevel === "middle"
      ? "중등부"
      : rank?.schoolLevel === "high"
        ? "고등부"
        : null;

  const personalClassLabel =
    classRanks.length === 1
      ? classRanks[0]!.displayLabel || classRanks[0]!.className
      : activeSlice?.displayLabel || activeSlice?.className || "반";

  const personalTeacher =
    classRanks.length === 1
      ? teacherLine(classRanks[0]!.teacherNames)
      : teacherLine(activeSlice?.teacherNames);

  const activeBoard = period === "this" ? monthlyBoard : hallOfFame;
  const boardLevel =
    activeBoard?.levelLabel ??
    (activeBoard?.schoolLevel === "middle"
      ? "중등부"
      : activeBoard?.schoolLevel === "high"
        ? "고등부"
        : null);

  const boardStudents = activeBoard?.students ?? [];
  const boardClasses = activeBoard?.classes ?? [];
  const visibleStudents = showAll
    ? boardStudents
    : boardStudents.slice(0, LIST_PREVIEW);
  const canExpand = boardStudents.length > LIST_PREVIEW;
  const hasBoard = Boolean(monthlyBoard || hallOfFame);

  return (
    <section className="space-y-[var(--rm-stack)]">
      {rank ? (
        <div className="rm-glass rm-glass--compact overflow-hidden">
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-[linear-gradient(120deg,color-mix(in_srgb,var(--rm-brand)_14%,transparent),transparent_72%)] p-3">
            <StudentAvatarBadge
              value={rank.avatarUrl}
              seed={rank.studentId}
              size="lg"
              className="border border-[var(--rm-border)] shadow-sm"
            />
            <div className="min-w-0 flex-1">
              <p className="rm-label">이번 달 나의 랭킹</p>
              <p className="truncate text-base font-extrabold text-[var(--rm-text)]">
                {rank.displayName}
                {activeSlice ? (
                  <span className="ml-1 text-xs font-semibold text-[var(--rm-text-muted)]">
                    · {activeSlice.displayLabel || activeSlice.className}
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-[var(--rm-text-muted)]">
                {nudgeCopy(rank)}
              </p>
            </div>
          </div>

          <ClassTabs
            slices={classRanks}
            selectedId={activeSlice?.classId ?? ""}
            onSelect={setSelectedClassId}
          />

          <p className="mb-1.5 text-[10px] font-bold tracking-wide text-[var(--rm-text-muted)]">
            내 순위
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <RankPill
              label="학원"
              rank={rank.academyRank}
              total={rank.academyTotal}
            />
            {levelLabel ? (
              <RankPill
                label={levelLabel}
                rank={rank.levelRank}
                total={rank.levelTotal}
              />
            ) : (
              <RankPill label="—" rank={null} total={null} />
            )}
            <RankPill
              label={personalClassLabel}
              rank={activeSlice?.classRank ?? null}
              total={activeSlice?.classTotal ?? null}
              sub={personalTeacher}
            />
          </div>
          <p className="mt-1.5 text-[10px] leading-snug text-[var(--rm-text-faint)]">
            학습 점수: 이번 달 다시 풀기·출석으로 쌓여요
            {typeof rank.studyScore === "number"
              ? ` · 지금 ${rank.studyScore}점`
              : ""}
          </p>

          <p className="mb-1.5 mt-3 text-[10px] font-bold tracking-wide text-[var(--rm-text-muted)]">
            {classRanks.length === 1
              ? `${classRanks[0]!.displayLabel || classRanks[0]!.className} 반 순위`
              : activeSlice
                ? `${activeSlice.displayLabel || activeSlice.className} 반 순위`
                : "반 순위"}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <RankPill
              label="우리 반 · 학원 대비"
              rank={activeSlice?.classAcademyRank ?? null}
              total={activeSlice?.classAcademyTotal ?? null}
            />
            <RankPill
              label={levelLabel ? `우리 반 · ${levelLabel}` : "우리 반"}
              rank={activeSlice?.classLevelRank ?? null}
              total={activeSlice?.classLevelTotal ?? null}
            />
          </div>
        </div>
      ) : null}

      {hasBoard ? (
        <div className="rm-glass rm-glass--compact">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="rm-label">
                {period === "this" ? "이번 달 전체 랭킹" : "지난달 TOP 100"}
              </p>
              <p className="mt-0.5 text-xs text-[var(--rm-text-muted)]">
                {activeBoard
                  ? `${activeBoard.monthLabel}${boardLevel ? ` · ${boardLevel}` : ""} · ${boardStudents.length}명`
                  : period === "this"
                    ? "아직 이번 달 점수가 없어요. 오늘 첫 복습을 완료하고 랭킹에 올라가 보세요."
                    : "지난달 기록이 아직 없어요"}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              {hallOfFame ? (
                <button
                  type="button"
                  onClick={() =>
                    setPeriod((p) => (p === "this" ? "prev" : "this"))
                  }
                  className="rounded-lg border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-2.5 py-1 text-[11px] font-bold text-[var(--rm-nav-active)] touch-manipulation"
                >
                  {period === "this" ? "지난달 TOP100" : "이번 달 랭킹"}
                </button>
              ) : null}
              {canExpand ? (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="rounded-lg border border-[var(--rm-border)] px-2.5 py-1 text-[11px] font-bold text-[var(--rm-nav-active)] touch-manipulation"
                >
                  {showAll ? "접기" : "더 보기"}
                </button>
              ) : null}
            </div>
          </div>

          {!activeBoard ? (
            <p className="mt-3 rounded-xl border border-dashed border-[var(--rm-border)] px-3 py-6 text-center text-[11px] text-[var(--rm-text-faint)]">
              {period === "this"
                ? "이번 달 기록이 아직 없어요"
                : "지난달 기록이 아직 없어요"}
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <p className="mb-1.5 text-[10px] font-bold tracking-wide text-[var(--rm-text-muted)]">
                  개인
                </p>
                {boardStudents.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[var(--rm-border)] px-3 py-6 text-center text-[11px] text-[var(--rm-text-faint)]">
                    {period === "this"
                      ? "아직 이번 달 점수가 없어요. 오늘 첫 복습을 완료하고 랭킹에 올라가 보세요."
                      : "지난달 기록이 아직 없어요"}
                  </p>
                ) : (
                  <ul className="max-h-[28rem] space-y-1.5 overflow-y-auto pr-0.5">
                    {visibleStudents.map((person) => (
                      <MonthlyPersonRow
                        key={`${period}-${person.studentId}`}
                        person={person}
                        highlight={
                          period === "this" &&
                          person.studentId === rank?.studentId
                        }
                      />
                    ))}
                  </ul>
                )}
              </div>

              <div className="min-w-0">
                <p className="mb-1.5 text-[10px] font-bold tracking-wide text-[var(--rm-text-muted)]">
                  반
                </p>
                {boardClasses.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[var(--rm-border)] px-3 py-6 text-center text-[11px] text-[var(--rm-text-faint)]">
                    반 랭킹을 기다리는 중
                  </p>
                ) : (
                  <ul className="max-h-[28rem] space-y-1.5 overflow-y-auto pr-0.5">
                    {boardClasses.map((room) => (
                      <MonthlyClassRow
                        key={`${period}-${room.classId}`}
                        room={room}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function rowTone(rank: number, highlight = false): string {
  if (highlight) {
    return "border-[color-mix(in_srgb,var(--rm-brand)_45%,var(--rm-border))] bg-[color-mix(in_srgb,var(--rm-brand)_12%,var(--rm-surface))]";
  }
  if (rank <= 3) return podiumTone(rank);
  return "border-[var(--rm-border)] bg-[var(--rm-bg-elevated)]";
}

function MonthlyPersonRow({
  person,
  highlight = false,
}: {
  person: HallOfFamePerson;
  highlight?: boolean;
}) {
  const teachers = teacherLine(person.teacherNames);
  const classBit =
    person.classDisplayLabel ?? person.className ?? "반 미배정";
  return (
    <li
      className={`grid min-h-[3.5rem] grid-cols-[1.75rem_2.75rem_minmax(0,1fr)] items-center gap-2.5 overflow-hidden rounded-xl border px-2.5 py-1.5 ${rowTone(person.rank, highlight)}`}
    >
      <span className="text-center text-sm font-black tabular-nums text-[var(--rm-text)]">
        {person.rank}
      </span>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden">
        <StudentAvatarBadge
          value={person.avatarUrl}
          seed={person.studentId}
          size="sm"
        />
      </div>
      <div className="min-w-0 overflow-hidden">
        <p className="truncate text-sm font-bold text-[var(--rm-text)]">
          {person.displayName}
          {highlight ? (
            <span className="ml-1 text-[10px] font-semibold text-[var(--rm-brand)]">
              나
            </span>
          ) : null}
        </p>
        <p className="truncate text-[10px] text-[var(--rm-text-muted)]">
          {classBit}
          {teachers ? ` · ${teachers}` : ""}
        </p>
        <p className="truncate text-[10px] text-[var(--rm-text-faint)]">
          점수 {person.studyScore}
          {person.attendanceDays > 0
            ? ` · 출석 ${person.attendanceDays}일`
            : ""}
        </p>
      </div>
    </li>
  );
}

function MonthlyClassRow({ room }: { room: HallOfFameClass }) {
  const teachers = teacherLine(room.teacherNames);
  return (
    <li
      className={`grid min-h-[3.5rem] grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-2.5 overflow-hidden rounded-xl border px-2.5 py-1.5 ${rowTone(room.rank)}`}
    >
      <span className="text-center text-sm font-black tabular-nums text-[var(--rm-text)]">
        {room.rank}
      </span>
      <div className="min-w-0 overflow-hidden">
        <p className="truncate text-sm font-extrabold text-[var(--rm-text)]">
          {room.displayLabel || room.className}
        </p>
        <p className="truncate text-[10px] text-[var(--rm-text-muted)]">
          {teachers || "담당 미지정"}
        </p>
        <p className="truncate text-[10px] text-[var(--rm-text-faint)]">
          평균 {room.avgScore} · {room.studentCount}명
        </p>
      </div>
    </li>
  );
}
