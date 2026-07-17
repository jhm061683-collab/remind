import type { SchoolLevel } from "@/lib/admin/grade";
import { createServiceClient } from "@/lib/supabase/service";

export type ClassRoomRef = {
  id: string;
  name: string;
  school_level: SchoolLevel | null;
  grade_number: number | null;
};

/** 기존 반을 찾고, 없으면 학년에 맞춰 새로 만듭니다. */
export async function findOrCreateClassRoom(params: {
  academyId: string;
  createdBy: string;
  name: string;
  schoolLevel?: SchoolLevel | null;
  gradeNumber?: number | null;
}): Promise<{ room?: ClassRoomRef; error?: string }> {
  const supabase = createServiceClient();
  const name = params.name.trim();
  if (!name) return { error: "반 이름을 입력해 주세요." };

  const schoolLevel = params.schoolLevel ?? null;
  const gradeNumber = params.gradeNumber ?? null;

  let query = supabase
    .from("class_rooms")
    .select("id, name, school_level, grade_number")
    .eq("academy_id", params.academyId)
    .eq("name", name);

  if (schoolLevel) {
    query = query.eq("school_level", schoolLevel);
  } else {
    query = query.is("school_level", null);
  }
  if (gradeNumber != null) {
    query = query.eq("grade_number", gradeNumber);
  } else {
    query = query.is("grade_number", null);
  }

  const { data: existing, error: findError } = await query.maybeSingle();
  if (findError) return { error: findError.message };
  if (existing) return { room: existing as ClassRoomRef };

  const { data: created, error: createError } = await supabase
    .from("class_rooms")
    .insert({
      academy_id: params.academyId,
      name,
      school_level: schoolLevel,
      grade_number: gradeNumber,
      created_by: params.createdBy,
    })
    .select("id, name, school_level, grade_number")
    .single();

  if (createError) {
    if (createError.message.includes("class_rooms_academy")) {
      return { error: "같은 학년에 같은 반 이름이 이미 있어요." };
    }
    return { error: createError.message };
  }
  return { room: created as ClassRoomRef };
}

export async function getAcademyIdForAdmin(
  adminId: string,
): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", adminId)
    .single();
  return data?.academy_id ?? null;
}
