"use server";

import { revalidatePath } from "next/cache";
import { parseBulkStudentXlsx } from "@/lib/admin/bulk-import";
import { requireAdmin, requireStaff } from "@/lib/server/admin/auth";
import { assignStudentToSubAdmin } from "@/lib/server/admin/queries";
import { createAcademyUser } from "@/lib/server/admin/create-user";
import {
  findOrCreateClassRoom,
  getAcademyIdForAdmin,
} from "@/lib/server/admin/class-rooms";
import { createServiceClient } from "@/lib/supabase/service";
import type { UserRole } from "@/types/user";
import { logStaffAudit } from "@/lib/server/audit/staff-audit";
import {
  decideStudentPasswordResetAccess,
  generateTemporaryPassword,
  temporaryPasswordMetadata,
} from "@/lib/server/admin/student-password-reset";

export async function assignStudentAction(
  studentId: string,
  subAdminId: string | null,
): Promise<{ error?: string }> {
  const session = await requireAdmin();
  const result = await assignStudentToSubAdmin(
    session.id,
    studentId,
    subAdminId,
  );
  revalidatePath("/admin/students");
  revalidatePath("/admin/assignments");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/sub-admins");
  return result;
}

export type CreatedCredential = {
  username: string;
  temporaryPassword: string;
};

export type CreateUserState = {
  error?: string;
  success?: string;
  credentials?: CreatedCredential[];
};

export async function createAcademyUserAction(
  _prev: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const session = await requireAdmin();

  const role = String(formData.get("role") ?? "") as UserRole;
  if (role !== "student" && role !== "sub_admin") {
    return { error: "잘못된 계정 유형입니다." };
  }

  const usernameRaw = String(formData.get("username") ?? "").trim();
  const nicknameRaw = String(formData.get("nickname") ?? "").trim();

  const result = await createAcademyUser(session.id, {
    // 학생 폼에는 username 칸이 없음 → 빈 문자열을 넘기면 검증이 이름을 무시함
    username: usernameRaw || undefined,
    displayName: String(formData.get("displayName") ?? ""),
    nickname: nicknameRaw || undefined,
    phone: String(formData.get("phone") ?? ""),
    schoolLevel:
      role === "student"
        ? (String(formData.get("schoolLevel") ?? "") as
            | "elementary"
            | "middle"
            | "high"
            | "adult")
        : undefined,
    gradeNumber:
      role === "student" ? Number(formData.get("gradeNumber") ?? 1) : undefined,
    role,
    // 서브선생님은 원장 권한 없음 — 원장 이름/권한은 관리자 계정 설정에서 관리
    isDirector: false,
  });

  if (result.error) return { error: result.error };

  const classIds = formData
    .getAll("classIds")
    .map((v) => String(v))
    .filter(Boolean);
  if (role === "student" && result.userId && classIds.length > 0) {
    const supabase = createServiceClient();
    const { error: classError } = await supabase.from("class_room_students").upsert(
      classIds.map((classRoomId) => ({
        class_room_id: classRoomId,
        student_id: result.userId as string,
      })),
      { onConflict: "class_room_id,student_id" },
    );
    if (classError) {
      return {
        error: `계정은 만들었지만 반 배정에 실패했습니다: ${classError.message}`,
      };
    }
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin/sub-admins");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/assignments");
  revalidatePath("/admin/classes");

  const label = role === "student" ? "학생" : "선생님";
  const classNote =
    classIds.length > 0 ? ` · 반 ${classIds.length}개 배정` : "";
  return {
    success: `${label} 계정을 만들었습니다. 아이디 ${result.username}. 임시 비밀번호는 지금만 보이며 저장되지 않습니다.${classNote}`,
    credentials:
      result.username && result.password
        ? [{ username: result.username, temporaryPassword: result.password }]
        : undefined,
  };
}

export async function createStudentsBulkAction(
  _prev: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const session = await requireAdmin();
  const file = formData.get("xlsx");
  if (!(file instanceof File)) {
    return { error: "엑셀 파일을 선택해 주세요." };
  }

  const buffer = await file.arrayBuffer();
  const parsed = parseBulkStudentXlsx(buffer);
  if (parsed.errors.length > 0) {
    return { error: parsed.errors.slice(0, 6).join("\n") };
  }

  let created = 0;
  const failures: string[] = [];
  const credentials: CreatedCredential[] = [];
  for (const row of parsed.rows) {
    const result = await createAcademyUser(session.id, {
      displayName: row.displayName,
      username: row.displayName,
      phone: row.phone,
      schoolLevel: row.schoolLevel,
      gradeNumber: row.gradeNumber,
      role: "student",
    });
    if (result.error) {
      failures.push(`${row.displayName}: ${result.error}`);
      continue;
    }
    created += 1;
    if (result.username && result.password) {
      credentials.push({
        username: result.username,
        temporaryPassword: result.password,
      });
    }
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin/dashboard");
  if (failures.length > 0) {
    return {
      error: `성공 ${created}명 / 실패 ${failures.length}명\n${failures
        .slice(0, 5)
        .join("\n")}`,
      credentials: credentials.length > 0 ? credentials : undefined,
    };
  }
  return {
    success: `${created}명 학생 계정을 일괄 등록했습니다. 임시 비밀번호는 지금만 보이며 저장되지 않습니다.`,
    credentials,
  };
}

export async function deleteStudentsAction(
  studentIds: string[],
): Promise<{ error?: string; success?: string; deletedCount?: number }> {
  const session = await requireAdmin();
  if (studentIds.length === 0) {
    return { error: "삭제할 학생을 선택해 주세요." };
  }

  const supabase = createServiceClient();
  const { data: me } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", session.id)
    .single();
  if (!me?.academy_id) return { error: "학원 정보를 찾을 수 없습니다." };

  const { data: targets, error: listError } = await supabase
    .from("profiles")
    .select(
      "id, role, academy_id, display_name, avatar_url, school_level, grade_number, withdrawn_at",
    )
    .in("id", studentIds)
    .eq("role", "student")
    .eq("academy_id", me.academy_id)
    .is("withdrawn_at", null);

  if (listError) return { error: listError.message };
  const deletable = targets ?? [];
  if (deletable.length === 0) {
    return { error: "삭제할 수 있는 학생 계정이 없습니다." };
  }

  let deleted = 0;
  const failures: string[] = [];
  for (const student of deletable) {
    await supabase
      .from("profiles")
      .update({ withdrawn_at: new Date().toISOString() })
      .eq("id", student.id);

    const { error } = await supabase.auth.admin.deleteUser(student.id);
    if (error) {
      failures.push(`${student.display_name}: ${error.message}`);
      continue;
    }
    deleted += 1;
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/assignments");

  if (failures.length > 0) {
    return {
      error: `삭제 ${deleted}명 / 실패 ${failures.length}명\n${failures
        .slice(0, 5)
        .join("\n")}`,
      deletedCount: deleted,
    };
  }
  return {
    success: `${deleted}명 학생 계정을 삭제했습니다.`,
    deletedCount: deleted,
  };
}

/**
 * 선생님 비활성화. 계정은 지우지 않고, 반은 유지한 채 담당만 해제합니다.
 */
export async function deactivateSubAdminAction(
  subAdminId: string,
): Promise<{ error?: string; success?: string }> {
  const session = await requireAdmin();
  if (!subAdminId) return { error: "비활성화할 선생님을 선택해 주세요." };
  if (subAdminId === session.id) {
    return { error: "자기 자신은 비활성화할 수 없습니다." };
  }

  const supabase = createServiceClient();
  const { data: me } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", session.id)
    .single();
  if (!me?.academy_id) return { error: "학원 정보를 찾을 수 없습니다." };

  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("id, role, academy_id, display_name, username, withdrawn_at")
    .eq("id", subAdminId)
    .eq("role", "sub_admin")
    .eq("academy_id", me.academy_id)
    .maybeSingle();

  if (targetError) return { error: targetError.message };
  if (!target) return { error: "선생님 계정을 찾을 수 없습니다." };
  if (target.withdrawn_at) {
    return { error: "이미 비활성화된 선생님입니다." };
  }

  const { error: teacherLinkError } = await supabase
    .from("class_room_teachers")
    .delete()
    .eq("teacher_id", subAdminId);
  if (teacherLinkError) return { error: teacherLinkError.message };

  const { error: assignError } = await supabase
    .from("student_assignments")
    .delete()
    .eq("sub_admin_id", subAdminId);
  if (assignError) return { error: assignError.message };

  const { error: withdrawError } = await supabase
    .from("profiles")
    .update({ withdrawn_at: new Date().toISOString() })
    .eq("id", subAdminId)
    .eq("academy_id", me.academy_id);
  if (withdrawError) return { error: withdrawError.message };

  await logStaffAudit({
    actorId: session.id,
    targetUserId: subAdminId,
    academyId: me.academy_id,
    action: "teacher_deactivate",
    success: true,
  });

  revalidatePath("/admin/sub-admins");
  revalidatePath("/admin/classes");
  revalidatePath("/admin/students");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/assignments");

  return {
    success: `${target.display_name} 선생님을 비활성화했습니다. 반은 그대로 남아 있으니 나중에 담당 선생님을 바꿔 주세요.`,
  };
}

/** 팀장 선생님(관리자 모드 전환 가능) on/off — 여러 명 가능 */
export async function setSubAdminTeamLeadAction(
  subAdminId: string,
  isTeamLead: boolean,
): Promise<{ error?: string; success?: string }> {
  const session = await requireAdmin();
  if (!subAdminId) return { error: "선생님을 선택해 주세요." };

  const supabase = createServiceClient();
  const { data: me } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", session.id)
    .single();
  if (!me?.academy_id) return { error: "학원 정보를 찾을 수 없습니다." };

  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("id, role, academy_id, display_name")
    .eq("id", subAdminId)
    .eq("role", "sub_admin")
    .eq("academy_id", me.academy_id)
    .maybeSingle();

  if (targetError) return { error: targetError.message };
  if (!target) return { error: "선생님 계정을 찾을 수 없습니다." };

  const { error } = await supabase
    .from("profiles")
    .update({ is_director: isTeamLead })
    .eq("id", subAdminId);
  if (error) return { error: error.message };

  revalidatePath("/admin/sub-admins");
  revalidatePath("/admin/classes");
  revalidatePath("/admin", "layout");

  return {
    success: isTeamLead
      ? `${target.display_name} 선생님을 팀장으로 지정했습니다. 관리자 모드로 전환할 수 있어요.`
      : `${target.display_name} 선생님의 팀장 권한을 해제했습니다.`,
  };
}

export async function resetStudentPasswordAction(
  studentId: string,
): Promise<{ error?: string; success?: string; temporaryPassword?: string }> {
  const session = await requireStaff();
  const supabase = createServiceClient();

  const [{ data: staff }, { data: student }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, role, academy_id")
      .eq("id", session.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id, role, academy_id, withdrawn_at")
      .eq("id", studentId)
      .maybeSingle(),
  ]);

  let isAssigned = false;
  if (staff?.role === "sub_admin" && student?.id) {
    const [{ data: assignment }, { data: classTeacherRows }] = await Promise.all([
      supabase
        .from("student_assignments")
        .select("student_id")
        .eq("sub_admin_id", session.id)
        .eq("student_id", studentId)
        .maybeSingle(),
      supabase
        .from("class_room_teachers")
        .select("class_room_id")
        .eq("teacher_id", session.id),
    ]);
    if (assignment) {
      isAssigned = true;
    } else {
      const classIds = (classTeacherRows ?? []).map((row) => row.class_room_id as string);
      if (classIds.length > 0) {
        const { data: membership } = await supabase
          .from("class_room_students")
          .select("student_id")
          .eq("student_id", studentId)
          .in("class_room_id", classIds)
          .limit(1)
          .maybeSingle();
        isAssigned = Boolean(membership);
      }
    }
  }

  const decision = decideStudentPasswordResetAccess({
    actorRole: session.role,
    actorAcademyId: (staff?.academy_id as string | null) ?? null,
    studentRole: (student?.role as string | null) ?? "",
    studentAcademyId: (student?.academy_id as string | null) ?? null,
    studentWithdrawn: Boolean(student?.withdrawn_at),
    isAssigned,
  });

  if (decision !== "ok") {
    await logStaffAudit({
      actorId: session.id,
      targetUserId: studentId,
      academyId: (staff?.academy_id as string | null) ?? null,
      action: "student_password_reset",
      success: false,
    });
    return { error: "이 학생의 비밀번호를 재설정할 권한이 없습니다." };
  }

  const temporaryPassword = generateTemporaryPassword();
  const { data: authUser } = await supabase.auth.admin.getUserById(studentId);
  const existingMeta =
    authUser?.user?.user_metadata && typeof authUser.user.user_metadata === "object"
      ? authUser.user.user_metadata
      : {};

  const { error } = await supabase.auth.admin.updateUserById(studentId, {
    password: temporaryPassword,
    user_metadata: temporaryPasswordMetadata(
      existingMeta as Record<string, unknown>,
    ),
  });

  await logStaffAudit({
    actorId: session.id,
    targetUserId: studentId,
    academyId: (staff?.academy_id as string | null) ?? null,
    action: "student_password_reset",
    success: !error,
  });

  if (error) return { error: error.message };

  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/students");
  return {
    success:
      "임시 비밀번호를 만들었습니다. 24시간 안에 로그인해서 새 비밀번호로 바꿔 주세요. 이 화면에서 한 번만 보여 주며, 저장되지 않습니다.",
    temporaryPassword,
  };
}

export async function sendAdminNotificationAction(
  targetUserIds: string[],
  title: string,
  body: string,
): Promise<{ error?: string; success?: string }> {
  const session = await requireStaff();
  if (!title.trim() || !body.trim()) {
    return { error: "알림 제목과 내용을 입력해 주세요." };
  }
  if (targetUserIds.length === 0) {
    return { error: "대상 학생을 선택해 주세요." };
  }

  const supabase = createServiceClient();
  const { data: me } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", session.id)
    .single();
  if (!me?.academy_id) return { error: "학원 정보를 찾을 수 없습니다." };

  const payload = targetUserIds.map((id) => ({
    academy_id: me.academy_id,
    target_user_id: id,
    sent_by: session.id,
    title: title.trim(),
    body: body.trim(),
  }));
  const { error } = await supabase.from("admin_notifications").insert(payload);
  if (error) return { error: error.message };

  let pushNote = "";
  try {
    const { sendPushToUsers } = await import("@/lib/server/push/send");
    const { sent } = await sendPushToUsers(targetUserIds, {
      title: title.trim(),
      body: body.trim(),
      url: "/notifications",
      tag: "remind-admin-notice",
    });
    if (sent > 0) pushNote = ` (푸시 ${sent}건)`;
  } catch (pushErr) {
    console.error("[admin-notification-push]", pushErr);
  }

  revalidatePath("/admin/notifications");
  return {
    success: `${targetUserIds.length}명에게 알림을 등록했습니다.${pushNote}`,
  };
}

export async function bulkAssignClassAction(
  studentIds: string[],
  classRoomId: string,
): Promise<{ error?: string; success?: string }> {
  const session = await requireAdmin();
  if (studentIds.length === 0) return { error: "학생을 선택해 주세요." };
  if (!classRoomId) return { error: "반을 선택해 주세요." };

  const academyId = await getAcademyIdForAdmin(session.id);
  if (!academyId) return { error: "학원 정보가 없습니다." };

  const supabase = createServiceClient();
  const { data: room } = await supabase
    .from("class_rooms")
    .select("id, name, school_level, grade_number")
    .eq("id", classRoomId)
    .eq("academy_id", academyId)
    .maybeSingle();
  if (!room) return { error: "반을 찾을 수 없습니다." };

  const rows = studentIds.map((studentId) => ({
    class_room_id: room.id,
    student_id: studentId,
  }));
  const { error } = await supabase
    .from("class_room_students")
    .upsert(rows, { onConflict: "class_room_id,student_id" });
  if (error) return { error: error.message };

  revalidatePath("/admin/students");
  revalidatePath("/admin/classes");
  revalidatePath("/admin/dashboard");
  return {
    success: `${studentIds.length}명을 「${room.name}」 반에 배정했습니다.`,
  };
}

export async function savePromotionRuleAction(
  month: number,
  day: number,
): Promise<{ error?: string; success?: string }> {
  const session = await requireAdmin();
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { error: "월/일 입력값이 올바르지 않습니다." };
  }
  const supabase = createServiceClient();
  const { data: me } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", session.id)
    .single();
  if (!me?.academy_id) return { error: "학원 정보가 없습니다." };
  const { error } = await supabase.from("academy_promotion_rules").upsert(
    {
      academy_id: me.academy_id,
      promotion_month: month,
      promotion_day: day,
      timezone: "Asia/Seoul",
    },
    { onConflict: "academy_id" },
  );
  if (error) return { error: error.message };
  revalidatePath("/admin/students");
  return { success: "자동 진급 기준일을 저장했습니다." };
}

export async function saveStudentDetailAction(
  studentId: string,
  payload: {
    schoolLevel: "elementary" | "middle" | "high" | "adult";
    gradeNumber: number;
    phone: string;
  },
): Promise<{ error?: string; success?: string }> {
  const session = await requireAdmin();
  const supabase = createServiceClient();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      phone: payload.phone.replace(/\D/g, ""),
      school_level: payload.schoolLevel,
      grade_number: payload.gradeNumber,
    })
    .eq("id", studentId);
  if (profileError) return { error: profileError.message };

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/dashboard");
  return { success: "학생 정보를 저장했습니다." };
}

/**
 * Premium 학원용: 학생별 GPT-4o 우선 사용 여부 토글
 * (골드 티켓이 남아 있을 때 GPT-4o를 먼저 쓸지 결정)
 */
export async function setStudentAiEnginePreferenceAction(
  studentId: string,
  preferGpt4o: boolean,
): Promise<{ error?: string; success?: string }> {
  const session = await requireAdmin();
  const supabase = createServiceClient();

  const academyId = await getAcademyIdForAdmin(session.id);
  if (!academyId) return { error: "학원 정보가 없습니다." };

  const { data: studentProfile } = await supabase
    .from("profiles")
    .select("academy_id, role")
    .eq("id", studentId)
    .maybeSingle();
  if (
    !studentProfile ||
    studentProfile.role !== "student" ||
    studentProfile.academy_id !== academyId
  ) {
    return { error: "우리 학원 학생만 설정할 수 있습니다." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ ai_prefer_gpt4o: preferGpt4o })
    .eq("id", studentId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/students/${studentId}`);
  return {
    success: preferGpt4o
      ? "이 학생의 기본 선택을 정밀 AI 정리로 바꿨습니다."
      : "이 학생의 기본 선택을 빠른 AI 정리로 바꿨습니다.",
  };
}

export async function createClassRoomAction(payload: {
  name: string;
  schoolLevel: "elementary" | "middle" | "high" | "adult";
  gradeNumber: number;
  teacherIds: string[];
}): Promise<{ error?: string; success?: string }> {
  const session = await requireAdmin();
  if (!payload.name.trim()) return { error: "반 이름을 입력해 주세요." };
  if (!payload.schoolLevel || !payload.gradeNumber) {
    return { error: "학교급과 학년을 입력해 주세요." };
  }

  const academyId = await getAcademyIdForAdmin(session.id);
  if (!academyId) return { error: "학원 정보가 없습니다." };

  const { room, error } = await findOrCreateClassRoom({
    academyId,
    createdBy: session.id,
    name: payload.name,
    schoolLevel: payload.schoolLevel,
    gradeNumber: payload.gradeNumber,
  });
  if (error || !room) return { error: error ?? "반 생성 실패" };

  const supabase = createServiceClient();
  if (payload.teacherIds.length > 0) {
    const { error: teacherError } = await supabase
      .from("class_room_teachers")
      .upsert(
        payload.teacherIds.map((teacherId) => ({
          class_room_id: room.id,
          teacher_id: teacherId,
        })),
        { onConflict: "class_room_id,teacher_id" },
      );
    if (teacherError) return { error: teacherError.message };
  }

  revalidatePath("/admin/classes");
  revalidatePath("/admin/dashboard");
  return { success: `「${room.name}」 반을 준비했습니다.` };
}

export async function updateClassTeachersAction(
  classRoomId: string,
  teacherIds: string[],
): Promise<{ error?: string; success?: string }> {
  const session = await requireAdmin();
  const supabase = createServiceClient();
  const { data: me } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", session.id)
    .single();
  if (!me?.academy_id) return { error: "학원 정보가 없습니다." };

  const { data: room } = await supabase
    .from("class_rooms")
    .select("id")
    .eq("id", classRoomId)
    .eq("academy_id", me.academy_id)
    .maybeSingle();
  if (!room) return { error: "반을 찾을 수 없습니다." };

  await supabase.from("class_room_teachers").delete().eq("class_room_id", classRoomId);
  if (teacherIds.length > 0) {
    const { error } = await supabase.from("class_room_teachers").insert(
      teacherIds.map((teacherId) => ({
        class_room_id: classRoomId,
        teacher_id: teacherId,
      })),
    );
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/classes");
  revalidatePath("/admin/dashboard");
  return { success: "담당 선생님을 저장했습니다." };
}

export async function assignStudentsToClassAction(
  classRoomId: string,
  studentIds: string[],
): Promise<{ error?: string; success?: string }> {
  const session = await requireAdmin();
  if (studentIds.length === 0) return { error: "학생을 선택해 주세요." };

  const academyId = await getAcademyIdForAdmin(session.id);
  if (!academyId) return { error: "학원 정보가 없습니다." };

  const supabase = createServiceClient();
  const { data: room } = await supabase
    .from("class_rooms")
    .select("id")
    .eq("id", classRoomId)
    .eq("academy_id", academyId)
    .maybeSingle();
  if (!room) return { error: "반을 찾을 수 없습니다." };

  const rows = studentIds.map((studentId) => ({
    class_room_id: classRoomId,
    student_id: studentId,
  }));
  const { error } = await supabase
    .from("class_room_students")
    .upsert(rows, { onConflict: "class_room_id,student_id" });
  if (error) return { error: error.message };

  revalidatePath("/admin/classes");
  revalidatePath("/admin/students");
  revalidatePath("/admin/dashboard");
  return { success: `${studentIds.length}명을 반에 추가했습니다.` };
}

export async function transferStudentClassAction(payload: {
  studentId: string;
  toClassRoomId: string;
  fromClassRoomId?: string | null;
  /** move: 기존 반에서 빼고 새 반으로 / add: 새 반만 추가 */
  mode: "move" | "add";
}): Promise<{ error?: string; success?: string }> {
  const session = await requireAdmin();
  if (!payload.studentId || !payload.toClassRoomId) {
    return { error: "학생과 옮길 반을 선택해 주세요." };
  }

  const academyId = await getAcademyIdForAdmin(session.id);
  if (!academyId) return { error: "학원 정보가 없습니다." };

  const supabase = createServiceClient();
  const { data: room } = await supabase
    .from("class_rooms")
    .select("id, name")
    .eq("id", payload.toClassRoomId)
    .eq("academy_id", academyId)
    .maybeSingle();
  if (!room) return { error: "옮길 반을 찾을 수 없습니다." };

  if (payload.mode === "move") {
    if (payload.fromClassRoomId) {
      await supabase
        .from("class_room_students")
        .delete()
        .eq("class_room_id", payload.fromClassRoomId)
        .eq("student_id", payload.studentId);
    } else {
      const { data: academyRooms } = await supabase
        .from("class_rooms")
        .select("id")
        .eq("academy_id", academyId);
      const roomIds = (academyRooms ?? []).map((r) => r.id);
      if (roomIds.length > 0) {
        await supabase
          .from("class_room_students")
          .delete()
          .eq("student_id", payload.studentId)
          .in("class_room_id", roomIds);
      }
    }
  }

  const { error } = await supabase.from("class_room_students").upsert(
    {
      class_room_id: payload.toClassRoomId,
      student_id: payload.studentId,
    },
    { onConflict: "class_room_id,student_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/admin/classes");
  revalidatePath("/admin/students");
  revalidatePath("/admin/dashboard");
  return {
    success:
      payload.mode === "move"
        ? `학생을 「${room.name}」 반으로 옮겼습니다.`
        : `학생을 「${room.name}」 반에 추가했습니다.`,
  };
}

export async function removeStudentFromClassAction(
  classRoomId: string,
  studentId: string,
): Promise<{ error?: string; success?: string }> {
  const session = await requireAdmin();
  const supabase = createServiceClient();
  const { data: me } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", session.id)
    .single();
  if (!me?.academy_id) return { error: "학원 정보가 없습니다." };

  const { data: room } = await supabase
    .from("class_rooms")
    .select("id")
    .eq("id", classRoomId)
    .eq("academy_id", me.academy_id)
    .maybeSingle();
  if (!room) return { error: "반을 찾을 수 없습니다." };

  const { error } = await supabase
    .from("class_room_students")
    .delete()
    .eq("class_room_id", classRoomId)
    .eq("student_id", studentId);
  if (error) return { error: error.message };

  revalidatePath("/admin/classes");
  revalidatePath("/admin/students");
  revalidatePath("/admin/dashboard");
  return { success: "반에서 학생을 제외했습니다." };
}

export async function deleteClassRoomAction(
  classRoomId: string,
): Promise<{ error?: string; success?: string }> {
  const session = await requireAdmin();
  const supabase = createServiceClient();
  const { data: me } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", session.id)
    .single();
  if (!me?.academy_id) return { error: "학원 정보가 없습니다." };

  const { error } = await supabase
    .from("class_rooms")
    .delete()
    .eq("id", classRoomId)
    .eq("academy_id", me.academy_id);
  if (error) return { error: error.message };

  revalidatePath("/admin/classes");
  revalidatePath("/admin/dashboard");
  return { success: "반을 삭제했습니다." };
}
