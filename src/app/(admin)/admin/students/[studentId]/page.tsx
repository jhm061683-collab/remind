import { notFound } from "next/navigation";
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
  const detail = await getStudentDetailForStaff(
    session.id,
    getEffectiveStaffRole(session),
    studentId,
  );
  if (!detail) notFound();

  return (
    <>
      <BackBar href="/admin/students" label="학생 관리" />
      <PageHeader
        title={`${detail.student.displayName} 상세`}
        description="학생 정보/학습 리포트/비밀번호/알림을 관리합니다."
      />
      <StudentDetailPanel detail={detail} />
    </>
  );
}
