import type { SchoolLevel } from "@/lib/admin/grade";
import { toGradeLabel } from "@/lib/admin/grade";

export function formatClassLabel(
  name: string,
  schoolLevel: SchoolLevel | null,
  gradeNumber: number | null,
): string {
  const grade = toGradeLabel(schoolLevel, gradeNumber);
  if (grade) return `${grade} ${name}`;
  return name;
}

/** 예: 고2S, 중1A */
export function formatCompactClassLabel(
  name: string,
  schoolLevel: SchoolLevel | null,
  gradeNumber: number | null,
): string {
  if (!schoolLevel || !gradeNumber || schoolLevel === "adult") {
    return name;
  }
  const prefix =
    schoolLevel === "elementary"
      ? "초"
      : schoolLevel === "middle"
        ? "중"
        : "고";
  return `${prefix}${gradeNumber}${name}`;
}
