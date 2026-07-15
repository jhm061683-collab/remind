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

/**
 * 엑셀이 휴대폰을 숫자로 읽어 앞자리 0이 사라진 경우(예: 1012341234)를 복구합니다.
 */
export function restorePhoneLeadingZero(raw: unknown): string {
  if (raw == null || raw === "") return "";

  if (typeof raw === "number" && Number.isFinite(raw)) {
    const digits = String(Math.trunc(raw)).replace(/\D/g, "");
    return fixKoreaMobileDigits(digits);
  }

  let text = String(raw).trim();
  if (/e[+-]/i.test(text)) {
    const n = Number(text);
    if (Number.isFinite(n)) {
      text = String(Math.trunc(n));
    }
  }

  return fixKoreaMobileDigits(normalizePhone(text));
}

function fixKoreaMobileDigits(digits: string): string {
  // 010xxxxxxxx → 엑셀에서 0 탈락 → 10자리 "10xxxxxxxx"
  if (digits.length === 10 && digits.startsWith("10")) {
    return `0${digits}`;
  }
  return digits;
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
