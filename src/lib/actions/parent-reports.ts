"use server";

import { getSession } from "@/lib/auth/session";
import { getEffectiveStaffRole } from "@/lib/auth/staff-mode";
import { createParentReport } from "@/lib/server/parent-reports";

export type CreateParentReportState = {
  error?: string;
  path?: string;
};

export type BulkParentReportItem = {
  studentId: string;
  studentName?: string;
  path?: string;
  error?: string;
};

export type BulkParentReportState = {
  error?: string;
  items?: BulkParentReportItem[];
};

export type IssuedParentReport = {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  path: string;
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

/** 선택한 학생들의 학부모 안심 보고서를 순서대로 생성한다. */
export async function createParentReportsBulkAction(input: {
  studentIds: string[];
  periodDays: number;
}): Promise<BulkParentReportState> {
  const session = await getSession();
  if (
    !session ||
    (session.role !== "admin" && session.role !== "sub_admin")
  ) {
    return { error: "원장 또는 강사 로그인이 필요합니다." };
  }

  const ids = Array.from(new Set(input.studentIds)).slice(0, 40);
  if (ids.length === 0) {
    return { error: "학생을 한 명 이상 선택해 주세요." };
  }

  const staffRole = getEffectiveStaffRole(session);
  const items: BulkParentReportItem[] = [];

  for (const studentId of ids) {
    try {
      const result = await createParentReport({
        staffId: session.id,
        staffRole,
        studentId,
        periodDays: input.periodDays,
      });
      items.push({
        studentId,
        path: `/report/${result.token}`,
        studentName: result.snapshot.studentName,
      });
    } catch (error) {
      console.error("[createParentReportsBulkAction]", studentId, error);
      const message = error instanceof Error ? error.message : "";
      items.push({
        studentId,
        error:
          message === "REPORT_STUDENT_FORBIDDEN"
            ? "권한 없음"
            : "생성 실패",
      });
    }
  }

  return { items };
}

export async function listIssuedParentReportsAction(input?: {
  query?: string;
}): Promise<{ error?: string; reports?: IssuedParentReport[] }> {
  const session = await getSession();
  if (
    !session ||
    (session.role !== "admin" && session.role !== "sub_admin")
  ) {
    return { error: "원장 또는 강사 로그인이 필요합니다." };
  }

  try {
    const { listParentReportsForStaff } = await import(
      "@/lib/server/parent-reports"
    );
    const reports = await listParentReportsForStaff({
      staffId: session.id,
      staffRole: getEffectiveStaffRole(session),
      query: input?.query,
      recentOnly: true,
    });
    return { reports };
  } catch (error) {
    console.error("[listIssuedParentReportsAction]", error);
    return { error: "발급된 보고서를 불러오지 못했습니다." };
  }
}

export async function revokeParentReportAction(
  reportId: string,
): Promise<{ error?: string; success?: string }> {
  const session = await getSession();
  if (
    !session ||
    (session.role !== "admin" && session.role !== "sub_admin")
  ) {
    return { error: "원장 또는 강사 로그인이 필요합니다." };
  }
  if (!reportId) return { error: "보고서를 선택해 주세요." };

  try {
    const { revokeParentReportForStaff } = await import(
      "@/lib/server/parent-reports"
    );
    await revokeParentReportForStaff({
      staffId: session.id,
      staffRole: getEffectiveStaffRole(session),
      reportId,
    });
    return { success: "보고서를 삭제했습니다." };
  } catch (error) {
    console.error("[revokeParentReportAction]", error);
    const message = error instanceof Error ? error.message : "";
    if (message === "REPORT_FORBIDDEN") {
      return { error: "이 보고서를 삭제할 권한이 없습니다." };
    }
    return { error: "보고서 삭제에 실패했습니다." };
  }
}
