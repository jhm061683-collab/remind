import { CreateUserForm } from "@/components/admin/create-user-form";
import { PromotionRuleForm } from "@/components/admin/promotion-rule-form";
import { AdminStudentsTable } from "@/components/admin/students-table";
import { PageHeader } from "@/components/ui/page-header";
import { requireStaff } from "@/lib/server/admin/auth";
import { getStaffDashboard } from "@/lib/server/admin/dashboard";
import {
  getClassManagementData,
  getPromotionRule,
} from "@/lib/server/admin/queries";
import { getEffectiveStaffRole } from "@/lib/auth/staff-mode";

export default async function AdminStudentsPage() {
  const session = await requireStaff();
  const data = await getStaffDashboard(session);
  const isAdmin = getEffectiveStaffRole(session) === "admin";
  const promotionRule = isAdmin ? await getPromotionRule(session.id) : null;
  const classData = isAdmin ? await getClassManagementData(session.id) : null;
  const classOptions =
    classData?.classes.map((c) => ({
      id: c.id,
      displayLabel: c.displayLabel,
    })) ?? [];

  return (
    <>
      <PageHeader
        title={isAdmin ? "학생 관리" : "담당 학생"}
        description={
          isAdmin
            ? "학생 계정을 만들고 학습 내역을 확인합니다."
            : "배정된 학생들의 학습 내역입니다."
        }
      />

      {isAdmin ? (
        <div className="mb-4 space-y-3">
          <CreateUserForm
            role="student"
            title="학생 계정 추가"
            classOptions={classOptions}
          />
          <PromotionRuleForm
            initialMonth={promotionRule?.promotionMonth ?? 1}
            initialDay={promotionRule?.promotionDay ?? 1}
          />
        </div>
      ) : null}

      <AdminStudentsTable
        students={data.students}
        canManage={isAdmin}
        classOptions={classOptions}
      />

      {!isAdmin && data.students.length === 0 ? (
        <p className="mt-4 text-center text-sm text-[var(--rm-text-muted)]">
          원장님이 반 관리에서 반 담당으로 지정해 주면 학생 목록이 표시됩니다.
        </p>
      ) : null}
    </>
  );
}
