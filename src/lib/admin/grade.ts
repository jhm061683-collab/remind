export type SchoolLevel = "elementary" | "middle" | "high" | "adult";

export function toGradeLabel(
  schoolLevel: SchoolLevel | null,
  gradeNumber: number | null,
): string | null {
  if (!schoolLevel || !gradeNumber) return null;
  if (schoolLevel === "adult") return "성인";
  const level =
    schoolLevel === "elementary"
      ? "초등"
      : schoolLevel === "middle"
        ? "중등"
        : "고등";
  if (schoolLevel === "high" && gradeNumber > 3) return "성인";
  return `${level} ${gradeNumber}학년`;
}

export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function defaultPasswordFromPhone(rawPhone: string): string {
  const onlyDigits = normalizePhone(rawPhone);
  if (onlyDigits.length < 4) return onlyDigits.padStart(4, "0");
  return onlyDigits.slice(-4);
}

export function computePromotedGrade(
  schoolLevel: SchoolLevel,
  gradeNumber: number,
): { schoolLevel: SchoolLevel; gradeNumber: number } {
  if (schoolLevel === "adult") return { schoolLevel, gradeNumber };
  if (schoolLevel === "elementary") {
    if (gradeNumber >= 6) return { schoolLevel: "middle", gradeNumber: 1 };
    return { schoolLevel, gradeNumber: gradeNumber + 1 };
  }
  if (schoolLevel === "middle") {
    if (gradeNumber >= 3) return { schoolLevel: "high", gradeNumber: 1 };
    return { schoolLevel, gradeNumber: gradeNumber + 1 };
  }
  if (gradeNumber >= 3) return { schoolLevel: "adult", gradeNumber: 1 };
  return { schoolLevel: "high", gradeNumber: gradeNumber + 1 };
}
