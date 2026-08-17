"use server";

import { getSession } from "@/lib/auth/session";
import { getEffectiveStaffRole } from "@/lib/auth/staff-mode";
import {
  getWrongNotePacket,
  WRONG_NOTE_PACKET_PHASES,
  type WrongNotePacketData,
  type WrongNotePacketPeriod,
  type WrongNotePacketPhase,
  type WrongNotePacketStatusFilter,
} from "@/lib/server/admin/wrong-note-packet";

export type GetWrongNotePacketState = {
  error?: string;
  data?: WrongNotePacketData;
};

export async function getWrongNotePacketAction(input: {
  studentId: string;
  period: WrongNotePacketPeriod;
  subjectId?: string | null;
  status?: WrongNotePacketStatusFilter;
  phases?: WrongNotePacketPhase[];
}): Promise<GetWrongNotePacketState> {
  const session = await getSession();
  if (
    !session ||
    (session.role !== "admin" && session.role !== "sub_admin")
  ) {
    return { error: "원장 또는 강사 로그인이 필요합니다." };
  }

  const phases = (input.phases ?? []).filter((p) =>
    (WRONG_NOTE_PACKET_PHASES as string[]).includes(p),
  );
  if (phases.length === 0) {
    return { error: "복습 단계를 하나 이상 선택해 주세요." };
  }

  try {
    const data = await getWrongNotePacket({
      staffId: session.id,
      staffRole: getEffectiveStaffRole(session),
      studentId: input.studentId,
      period: input.period,
      subjectId: input.subjectId,
      status: input.status,
      phases,
    });
    return { data };
  } catch (error) {
    console.error("[getWrongNotePacketAction]", error);
    const message = error instanceof Error ? error.message : "";
    if (message === "PACKET_STUDENT_FORBIDDEN") {
      return { error: "이 학생의 오답 모음을 볼 권한이 없습니다." };
    }
    if (message === "PACKET_ACADEMY_NOT_FOUND") {
      return { error: "학원 정보를 찾지 못했습니다." };
    }
    return { error: "오답 모음을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
