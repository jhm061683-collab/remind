import { notFound, redirect } from "next/navigation";
import { StudentDetailPanel } from "@/components/admin/student-detail-panel";
import { PageHeader } from "@/components/ui/page-header";
import { BackBar } from "@/components/ui/back-bar";
import { getEffectiveStaffRole } from "@/lib/auth/staff-mode";
import { requireStaff } from "@/lib/server/admin/auth";
import { getStudentDetailForStaff } from "@/lib/server/admin/queries";

type Props = {
  params: Promise<{ studentId: string }>;
};

export default async function AdminStudentDetailPage({ params }: Props) {
  const session = await requireStaff();
  const { studentId } = await params;
  const staffRole = getEffectiveStaffRole(session);
  const detail = await getStudentDetailForStaff(
    session.id,
    staffRole,
    studentId,
  );
  if (!detail) {
    if (staffRole === "sub_admin") {
      redirect(
        "/admin/permission-denied?need=assigned-student&from=/admin/students",
      );
    }
    notFound();
  }

  return (
    <>
      <BackBar href="/admin/students" label="학생 설정" />
      <PageHeader
        title={`${detail.student.displayName} 상세`}
        description="10초 요약 · 오답모음 PDF · 학부모 보고서 · 계정 관리"
      />
      <StudentDetailPanel
        detail={detail}
        canManageAccount={staffRole === "admin"}
      />
    </>
  );
}
