"use server";

import { getSession } from "@/lib/auth/session";
import { getEffectiveStaffRole } from "@/lib/auth/staff-mode";
import {
  getConsultingSnapshot,
  type ConsultingSnapshot,
} from "@/lib/server/admin/consulting-snapshot";
import type { ConsultingPeriodPreset } from "@/lib/utils/date-range";

export async function getConsultingSnapshotAction(input: {
  studentId: string;
  period: ConsultingPeriodPreset;
  subjectId?: string | "all";
}): Promise<{ error?: string; snapshot?: ConsultingSnapshot }> {
  const session = await getSession();
  if (
    !session ||
    (session.role !== "admin" && session.role !== "sub_admin")
  ) {
    return { error: "원장 또는 강사 로그인이 필요합니다." };
  }

  try {
    const snapshot = await getConsultingSnapshot({
      staffId: session.id,
      staffRole: getEffectiveStaffRole(session),
      studentId: input.studentId,
      period: input.period,
      subjectId: input.subjectId ?? "all",
    });
    if (!snapshot) {
      return { error: "이 학생의 상담 정보를 볼 권한이 없습니다." };
    }
    return { snapshot };
  } catch (error) {
    console.error("[getConsultingSnapshotAction]", error);
    return { error: "상담 스냅샷을 불러오지 못했습니다." };
  }
}
