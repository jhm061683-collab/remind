"use server";

import { getSession } from "@/lib/auth/session";
import { getEffectiveStaffRole } from "@/lib/auth/staff-mode";
import { createParentReport } from "@/lib/server/parent-reports";

export type CreateParentReportState = {
  error?: string;
  path?: string;
};

export async function createParentReportAction(input: {
  studentId: string;
  periodDays: number;
}): Promise<CreateParentReportState> {
  const session = await getSession();
  if (
    !session ||
    (session.role !== "admin" && session.role !== "sub_admin")
  ) {
    return { error: "원장 또는 강사 로그인이 필요합니다." };
  }

  try {
    const result = await createParentReport({
      staffId: session.id,
      staffRole: getEffectiveStaffRole(session),
      studentId: input.studentId,
      periodDays: input.periodDays,
    });
    return { path: `/report/${result.token}` };
  } catch (error) {
    console.error("[createParentReportAction]", error);
    const message = error instanceof Error ? error.message : "";
    if (message === "REPORT_STUDENT_FORBIDDEN") {
      return { error: "이 학생의 보고서를 만들 권한이 없습니다." };
    }
    if (message.includes("parent_reports")) {
      return {
        error:
          "보고서 DB 설정이 필요합니다. Supabase에서 031 마이그레이션을 실행해 주세요.",
      };
    }
    return { error: "보고서를 만들지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
