import { notFound } from "next/navigation";
import { StudentDetailPanel } from "@/components/admin/student-detail-panel";
import { PageHeader } from "@/components/ui/page-header";
import { requireStaff } from "@/lib/server/admin/auth";
import { getStudentDetailForStaff } from "@/lib/server/admin/queries";
import { createServiceClient } from "@/lib/supabase/service";

type Props = {
  params: Promise<{ studentId: string }>;
};

export default async function AdminStudentDetailPage({ params }: Props) {
  const session = await requireStaff();
  const { studentId } = await params;
  const detail = await getStudentDetailForStaff(
    session.id,
    session.role === "sub_admin" ? "sub_admin" : "admin",
    studentId,
  );
  if (!detail) notFound();

  const supabase = createServiceClient();
  const { data: teachers } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("role", "sub_admin")
    .order("display_name", { ascending: true });

  return (
    <>
      <PageHeader
        title={`${detail.student.displayName} 상세`}
        description="학생 정보/학습 리포트/비밀번호/알림을 관리합니다."
      />
      <StudentDetailPanel
        detail={detail}
        teacherOptions={(teachers ?? []).map((t) => ({
          id: t.id as string,
          displayName: t.display_name as string,
        }))}
      />
    </>
  );
}
