"use client";

import { PageHeader } from "@/components/ui/page-header";
import { useSubjects } from "@/components/student/subject-provider";

type Props = {
  subjectId: string;
  description?: string;
  suffix?: string;
};

export function SubjectPageHeader({ subjectId, description, suffix }: Props) {
  const { getSubjectName } = useSubjects();
  const title = suffix
    ? `${getSubjectName(subjectId)} ${suffix}`
    : getSubjectName(subjectId);

  return <PageHeader title={title} description={description} />;
}
