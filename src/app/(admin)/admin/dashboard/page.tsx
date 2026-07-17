import { AdminStatCard } from "@/components/admin/stat-card";
import { AdminStudentsTable } from "@/components/admin/students-table";
import { StudentOverviewCharts } from "@/components/admin/student-overview-charts";
import { WeeklyActivityChart } from "@/components/admin/weekly-activity-chart";
import { PageHeader } from "@/components/ui/page-header";
import { requireStaff } from "@/lib/server/admin/auth";
import { getStaffDashboard } from "@/lib/server/admin/dashboard";
import { getClassManagementData } from "@/lib/server/admin/queries";
import { getEffectiveStaffRole } from "@/lib/auth/staff-mode";

function pct(value: number | null): string {
  if (value === null) return "—";
  return `${value}%`;
}

export default async function AdminDashboardPage() {
  const session = await requireStaff();
  const data = await getStaffDashboard(session);
  const isSubAdmin = getEffectiveStaffRole(session) === "sub_admin";
  const classData =
    !isSubAdmin ? await getClassManagementData(session.id) : null;
  const classOptions =
    classData?.classes.map((c) => ({
      id: c.id,
      displayLabel: c.displayLabel,
    })) ?? [];

  const fulfillment =
    data.shortFulfillmentPct ?? data.mediumLongFulfillmentPct;

  return (
    <>
      <PageHeader
        title="대시보드"
        description={
          isSubAdmin ? "담당 학생 학습 현황" : "학습 현황 · 복습 이행률"
        }
      />

      <div
        className={`grid grid-cols-2 gap-2 ${
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
          {isSubAdmin ? "담당 학생" : "학생 요약"}
        </h2>
        {data.students.length === 0 && isSubAdmin ? (
          <div className="rounded-xl border border-[var(--rm-warning)]/30 bg-[color-mix(in_srgb,var(--rm-warning)_12%,var(--rm-surface))] px-3 py-4 text-center text-sm text-[var(--rm-text)]">
            <p className="font-medium">담당 학생이 아직 없어요</p>
            <p className="mt-1 text-[var(--rm-text-muted)]">
              원장님이 <strong>반 관리</strong>에서 반 담당으로 지정해 주면
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
