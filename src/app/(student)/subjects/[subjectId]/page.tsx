import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ subjectId: string }>;
};

/** 과목 상세 → 복습 주기 설정으로 바로 이동 */
export default async function SubjectDetailPage({ params }: Props) {
  const { subjectId } = await params;
  redirect(`/subjects/${subjectId}/settings`);
}
