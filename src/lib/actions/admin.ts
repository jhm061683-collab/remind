"use server";

import { revalidatePath } from "next/cache";
import { parseBulkStudentXlsx } from "@/lib/admin/bulk-import";
import { requireAdmin, requireStaff } from "@/lib/server/admin/auth";
import { assignStudentToSubAdmin } from "@/lib/server/admin/queries";
import { createAcademyUser } from "@/lib/server/admin/create-user";
import { createServiceClient } from "@/lib/supabase/service";
import type { UserRole } from "@/types/user";

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

export type CreateUserState = { error?: string; success?: string };

export async function createAcademyUserAction(
  _prev: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const session = await requireAdmin();

  const role = String(formData.get("role") ?? "") as UserRole;
  if (role !== "student" && role !== "sub_admin") {
    return { error: "잘못된 계정 유형입니다." };
  }

  const result = await createAcademyUser(session.id, {
    username: String(formData.get("displayName") ?? ""),
    password: String(formData.get("password") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
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
  });

  if (result.error) return { error: result.error };

  revalidatePath("/admin/students");
  revalidatePath("/admin/sub-admins");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/assignments");

  const label = role === "student" ? "학생" : "서브관리자";
  return {
    success: `${label} 계정 생성 완료: 아이디 ${result.username}, 초기 비밀번호 ${result.password}`,
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
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin/dashboard");
  if (failures.length > 0) {
    return {
      error: `성공 ${created}명 / 실패 ${failures.length}명\n${failures
        .slice(0, 5)
        .join("\n")}`,
    };
  }
  return { success: `${created}명 학생 계정을 일괄 등록했습니다.` };
}

export async function resetStudentPasswordAction(
  studentId: string,
  nextPassword: string,
): Promise<{ error?: string; success?: string }> {
  const session = await requireStaff();
  if (!nextPassword || nextPassword.length < 4) {
    return { error: "비밀번호는 4자 이상으로 입력해 주세요." };
  }
  const supabase = createServiceClient();
  const { error } = await supabase.auth.admin.updateUserById(studentId, {
    password: nextPassword,
  });
  if (error) return { error: error.message };
  const { upsertAdminVisiblePassword } = await import(
    "@/lib/server/admin/password-notes"
  );
  await upsertAdminVisiblePassword(studentId, nextPassword, session.id);
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/students");
  return { success: "비밀번호를 변경했습니다." };
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
  revalidatePath("/admin/notifications");
  return { success: `${targetUserIds.length}명에게 알림을 등록했습니다.` };
}

export async function bulkAssignClassAction(
  studentIds: string[],
  className: string,
): Promise<{ error?: string; success?: string }> {
  const session = await requireAdmin();
  if (studentIds.length === 0) return { error: "학생을 선택해 주세요." };
  if (!className.trim()) return { error: "반명을 입력해 주세요." };
  const supabase = createServiceClient();
  const { data: me } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", session.id)
    .single();
  if (!me?.academy_id) return { error: "학원 정보가 없습니다." };

  const { data: room, error: roomError } = await supabase
    .from("class_rooms")
    .upsert(
      {
        academy_id: me.academy_id,
        name: className.trim(),
        created_by: session.id,
      },
      { onConflict: "academy_id,name" },
    )
    .select("id")
    .single();
  if (roomError || !room) return { error: roomError?.message ?? "반 생성 실패" };

  await supabase.from("class_room_students").delete().in("student_id", studentIds);
  const { error } = await supabase.from("class_room_students").insert(
    studentIds.map((studentId) => ({
      class_room_id: room.id,
      student_id: studentId,
    })),
  );
  if (error) return { error: error.message };
  revalidatePath("/admin/students");
  revalidatePath("/admin/dashboard");
  return { success: `${studentIds.length}명을 ${className} 반에 배정했습니다.` };
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
    className: string;
    teacherIds: string[];
    schoolLevel: "elementary" | "middle" | "high" | "adult";
    gradeNumber: number;
    phone: string;
  },
): Promise<{ error?: string; success?: string }> {
  const session = await requireAdmin();
  const supabase = createServiceClient();
  const { data: me } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", session.id)
    .single();
  if (!me?.academy_id) return { error: "학원 정보가 없습니다." };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      phone: payload.phone.replace(/\D/g, ""),
      school_level: payload.schoolLevel,
      grade_number: payload.gradeNumber,
    })
    .eq("id", studentId);
  if (profileError) return { error: profileError.message };

  let classId: string | null = null;
  if (payload.className.trim()) {
    const { data: room, error: roomError } = await supabase
      .from("class_rooms")
      .upsert(
        {
          academy_id: me.academy_id,
          name: payload.className.trim(),
          created_by: session.id,
        },
        { onConflict: "academy_id,name" },
      )
      .select("id")
      .single();
    if (roomError || !room) return { error: roomError?.message ?? "반 생성 실패" };
    classId = room.id;
  }

  await supabase.from("class_room_students").delete().eq("student_id", studentId);
  if (classId) {
    const { error: insertStudentError } = await supabase
      .from("class_room_students")
      .insert({ class_room_id: classId, student_id: studentId });
    if (insertStudentError) return { error: insertStudentError.message };

    await supabase.from("class_room_teachers").delete().eq("class_room_id", classId);
    if (payload.teacherIds.length > 0) {
      const { error: teacherError } = await supabase.from("class_room_teachers").insert(
        payload.teacherIds.map((teacherId) => ({
          class_room_id: classId as string,
          teacher_id: teacherId,
        })),
      );
      if (teacherError) return { error: teacherError.message };
    }
  }

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/dashboard");
  return { success: "학생 정보를 저장했습니다." };
}
