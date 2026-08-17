import { Suspense } from "react";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { PromotionRuleForm } from "@/components/admin/promotion-rule-form";
import { AdminStudentsTable } from "@/components/admin/students-table";
import { BulkParentReportsPanel } from "@/components/admin/bulk-parent-reports";
import { AdminSettingsTabs } from "@/components/admin/admin-settings-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { requireStaff } from "@/lib/server/admin/auth";
import {
  getCachedAdminClassOptions,
  getStaffStudentList,
} from "@/lib/server/admin/dashboard";
import { getPromotionRule } from "@/lib/server/admin/queries";
import { getEffectiveStaffRole } from "@/lib/auth/staff-mode";
import type { AdminStudentRow, ClassOption } from "@/lib/types/admin";

type Props = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function AdminStudentsPage({ searchParams }: Props) {
  const session = await requireStaff();
  const params = (await searchParams) ?? {};
  const isAdmin = getEffectiveStaffRole(session) === "admin";
  const tab =
    params.tab === "add" || params.tab === "reports" ? params.tab : "list";

  const tabs = isAdmin
    ? [
        { id: "list", label: "목록" },
        { id: "add", label: "추가" },
        { id: "reports", label: "보고서" },
      ]
    : [
        { id: "list", label: "목록" },
        { id: "reports", label: "보고서" },
      ];

  let students: AdminStudentRow[] = [];
  let classOptions: ClassOption[] = [];
  let promotionRule: Awaited<ReturnType<typeof getPromotionRule>> = null;

  if (tab === "add" && isAdmin) {
    // 추가 탭: 학생 전체 대시보드를 절대 기다리지 않음
    [classOptions, promotionRule] = await Promise.all([
      getCachedAdminClassOptions(session.id),
      getPromotionRule(session.id),
    ]);
  } else if (tab === "list") {
    [students, classOptions] = await Promise.all([
      getStaffStudentList(session),
      isAdmin
        ? getCachedAdminClassOptions(session.id)
        : Promise.resolve([] as ClassOption[]),
    ]);
  } else if (tab === "reports") {
    [students, classOptions] = await Promise.all([
      getStaffStudentList(session),
      isAdmin
        ? getCachedAdminClassOptions(session.id)
        : Promise.resolve([] as ClassOption[]),
    ]);
  }

  return (
    <>
      <PageHeader
        title={isAdmin ? "학생 설정" : "담당 학생"}
        description={
          isAdmin
            ? "목록 · 계정 추가 · 학부모 보고서"
            : "담당 학생 목록과 보고서를 관리합니다."
        }
      />

      <Suspense fallback={null}>
        <AdminSettingsTabs tabs={tabs} defaultTab="list" />
      </Suspense>

      {tab === "add" && isAdmin ? (
        <div className="space-y-3">
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

      {tab === "list" ? (
        <>
          <AdminStudentsTable
            students={students}
            canManage={isAdmin}
            classOptions={classOptions}
          />
          {!isAdmin && students.length === 0 ? (
            <p className="mt-4 text-center text-sm text-[var(--rm-text-muted)]">
              원장님이 반 설정에서 반 담당으로 지정해 주면 학생 목록이
              표시됩니다.
            </p>
          ) : null}
        </>
      ) : null}

      {tab === "reports" ? (
        <BulkParentReportsPanel
          students={students}
          classOptions={classOptions}
          scopeLabel={isAdmin ? "전체 학생" : "담당 학생"}
        />
      ) : null}
    </>
  );
}
