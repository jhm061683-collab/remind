import { AdminStatCard } from "@/components/admin/stat-card";
import { AdminStudentsTable } from "@/components/admin/students-table";
import { AcademyAiQuotaPanel } from "@/components/admin/academy-ai-quota-panel";
import { AcademyLearningRankPanel } from "@/components/admin/academy-learning-rank-panel";
import { ClassStudyVolumeBoard } from "@/components/admin/class-study-volume-board";
import { StaffTodayActions } from "@/components/admin/staff-today-actions";
import { StudentOverviewCharts } from "@/components/admin/student-overview-charts";
import { WeeklyActivityChart } from "@/components/admin/weekly-activity-chart";
import { PageHeader } from "@/components/ui/page-header";
import { requireStaff } from "@/lib/server/admin/auth";
import { getStaffDashboard } from "@/lib/server/admin/dashboard";
import { getClassManagementData } from "@/lib/server/admin/queries";
import { getAcademyAiQuotaForStaff } from "@/lib/server/ai/academy-usage";
import { getEffectiveStaffRole } from "@/lib/auth/staff-mode";
import { getAcademyLearningLeaderboard } from "@/lib/server/rankings";
import { createServiceClient } from "@/lib/supabase/service";
import type { AdminStudentRow, ClassOption } from "@/lib/types/admin";
import type { LearningLeaderboardRow } from "@/lib/server/rankings";

function pct(value: number | null): string {
  if (value === null) return "—";
  return `${value}%`;
}

function classOptionsFromStudents(students: AdminStudentRow[]): ClassOption[] {
  const map = new Map<string, ClassOption>();
  for (const student of students) {
    const labels =
      student.classNames.length > 0
        ? student.classNames
        : student.className
          ? [student.className]
          : [];
    for (const label of labels) {
      const key = `${student.gradeLabel ?? ""}::${label}`;
      if (map.has(key)) continue;
      map.set(key, {
        id: key,
        displayLabel: label,
        gradeLabel: student.gradeLabel,
        name: label,
      });
    }
  }
  return Array.from(map.values());
}

function scopeLeaderboardToStudents(
  rows: LearningLeaderboardRow[],
  studentIds: Set<string>,
): LearningLeaderboardRow[] {
  const scoped = rows.filter((row) => studentIds.has(row.studentId));
  const sorted = [...scoped].sort(
    (a, b) =>
      b.studyScore - a.studyScore ||
      b.attendanceDays - a.attendanceDays ||
      a.displayName.localeCompare(b.displayName, "ko"),
  );
  let rank = 1;
  return sorted.map((row, i) => {
    if (i > 0) {
      const prev = sorted[i - 1]!;
      if (
        prev.studyScore !== row.studyScore ||
        prev.attendanceDays !== row.attendanceDays
      ) {
        rank = i + 1;
      }
    }
    return { ...row, rank };
  });
}

type Props = {
  searchParams?: Promise<{ scope?: string }>;
};

export default async function AdminDashboardPage({ searchParams }: Props) {
  const session = await requireStaff();
  const params = (await searchParams) ?? {};
  const data = await getStaffDashboard(
    session,
    params.scope,
    "/admin/dashboard",
  );
  const isSubAdmin = getEffectiveStaffRole(session, params.scope) === "sub_admin";
  const classData =
    !isSubAdmin ? await getClassManagementData(session.id) : null;
  const classOptions =
    classData?.classes.map((c) => ({
      id: c.id,
      displayLabel: c.displayLabel,
      gradeLabel: c.gradeLabel,
      name: c.name,
    })) ?? classOptionsFromStudents(data.students);
  const aiQuota = !isSubAdmin
    ? await getAcademyAiQuotaForStaff(session.id)
    : null;

  let learningBoard: LearningLeaderboardRow[] | null = null;
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", session.id)
    .maybeSingle();
  if (profile?.academy_id) {
    const fullBoard = await getAcademyLearningLeaderboard(
      profile.academy_id,
      500,
    );
    if (isSubAdmin) {
      const allowed = new Set(data.students.map((s) => s.id));
      learningBoard = scopeLeaderboardToStudents(fullBoard, allowed);
    } else {
      learningBoard = fullBoard;
    }
  }

  const fulfillment =
    data.shortFulfillmentPct ?? data.mediumLongFulfillmentPct;
  return (
    <>
      <PageHeader
        title="대시보드"
        description={
          isSubAdmin
            ? "오늘 할 일 · 담당 학생 케어 · 상담 스냅샷"
            : "오늘 할 일 · 관리 사각지대 · 학습 현황"
        }
      />

      <div className="mb-3">
        <StaffTodayActions
          isSubAdmin={isSubAdmin}
          students={data.students}
          scope={params.scope}
        />
      </div>

      <details className="mt-3 rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--rm-text)]">
          추가 통계 보기
        </summary>
        <div
          className={`mt-3 grid grid-cols-2 gap-2 ${
            isSubAdmin
              ? "sm:grid-cols-3"
              : "sm:grid-cols-3 xl:grid-cols-5"
          }`}
        >
        <AdminStatCard
          label={isSubAdmin ? "담당 학생" : "전체 학생"}
          value={`${data.totalStudents}명`}
        />
        {!isSubAdmin ? (
          <AdminStatCard
            label="오늘 로그인"
            value={`${data.loggedInToday}명`}
          />
        ) : null}
        <AdminStatCard
          label="오늘 학습"
          value={`${data.activeToday}명`}
          hint="오늘 1회 이상 다시 푼 학생"
        />
        <AdminStatCard
          label={isSubAdmin ? "복습 이행률" : "단기 이행률"}
          value={pct(isSubAdmin ? fulfillment : data.shortFulfillmentPct)}
          hint={
            isSubAdmin
              ? "오늘 마감 문제 중 오늘 푼 비율"
              : "오늘 마감인 단기 문제 기준"
          }
        />
        {!isSubAdmin ? (
          <AdminStatCard
            label="중·장기 이행률"
            value={pct(data.mediumLongFulfillmentPct)}
            hint="오늘 마감인 중·장기 문제 기준"
          />
        ) : null}
      </div>
      </details>

      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <AcademyLearningRankPanel
          rows={learningBoard}
          hideTeacherFilter={isSubAdmin}
          scopeLabel={isSubAdmin ? "담당" : "전체"}
        />
        {!isSubAdmin ? (
          <AcademyAiQuotaPanel summary={aiQuota} />
        ) : (
          <ClassStudyVolumeBoard
            rows={learningBoard}
            title="담당 반 · 학생별 학습량"
          />
        )}
      </div>

      {!isSubAdmin ? (
        <div className="mt-3">
          <ClassStudyVolumeBoard rows={learningBoard} />
        </div>
      ) : null}

      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <StudentOverviewCharts
          students={data.students}
          title={isSubAdmin ? "담당 학생 인원" : "전체 학생 인원"}
        />
        <WeeklyActivityChart
          data={data.dailyReviews}
          title={isSubAdmin ? "담당 최근 7일 복습" : "최근 7일 복습"}
        />
      </div>

      <section className="mt-3">
        <h2 className="mb-2 text-sm font-semibold text-[var(--rm-text)]">
          {isSubAdmin ? "담당 학생 · 이름 클릭 = 상담 스냅샷" : "학생 요약"}
        </h2>
        {data.students.length === 0 && isSubAdmin ? (
          <div className="rounded-xl border border-[var(--rm-warning)]/30 bg-[color-mix(in_srgb,var(--rm-warning)_12%,var(--rm-surface))] px-3 py-4 text-center text-sm text-[var(--rm-text)]">
            <p className="font-medium">담당 학생이 아직 없어요</p>
            <p className="mt-1 text-[var(--rm-text-muted)]">
              원장님이 <strong>반 설정</strong>에서 반 담당으로 지정해 주면
              여기에 보입니다.
            </p>
          </div>
        ) : (
          <AdminStudentsTable
            students={data.students}
            canManage={!isSubAdmin}
            classOptions={classOptions}
          />
        )}
      </section>
    </>
  );
}
