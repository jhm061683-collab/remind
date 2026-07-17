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
