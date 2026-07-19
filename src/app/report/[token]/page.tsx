import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ParentReportView } from "@/components/reports/parent-report-view";
import { getParentReportByToken } from "@/lib/server/parent-reports";

export const metadata: Metadata = {
  title: "Re:mind 학습 보고서",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ token: string }>;
};

export default async function PublicParentReportPage({ params }: Props) {
  const { token } = await params;
  const report = await getParentReportByToken(token);
  if (!report) notFound();

  return (
    <ParentReportView
      report={report.snapshot}
      expiresAt={report.expiresAt}
    />
  );
}
