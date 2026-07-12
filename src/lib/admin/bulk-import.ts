import * as XLSX from "xlsx";
import type { SchoolLevel } from "@/lib/admin/grade";

export type BulkStudentRow = {
  displayName: string;
  phone: string;
  schoolLevel: SchoolLevel;
  gradeNumber: number;
};

function parseSchoolLevel(raw: string): SchoolLevel | null {
  const v = raw.trim();
  if (v === "초등") return "elementary";
  if (v === "중등") return "middle";
  if (v === "고등") return "high";
  if (v === "성인") return "adult";
  return null;
}

export function parseBulkStudentXlsx(buffer: ArrayBuffer): {
  rows: BulkStudentRow[];
  errors: string[];
} {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { rows: [], errors: ["시트가 비어 있습니다."] };
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const rows: BulkStudentRow[] = [];
  const errors: string[] = [];

  json.forEach((raw, idx) => {
    const line = idx + 2;
    const displayName = String(raw["이름"] ?? "").trim();
    const phone = String(raw["휴대폰"] ?? "").trim();
    const school = parseSchoolLevel(String(raw["학교급"] ?? ""));
    const gradeNumber = Number(raw["학년"] ?? 0);

    if (!displayName) {
      errors.push(`${line}행: 이름이 비어 있습니다.`);
      return;
    }
    if (!phone) {
      errors.push(`${line}행: 휴대폰이 비어 있습니다.`);
      return;
    }
    if (!school) {
      errors.push(`${line}행: 학교급은 초등/중등/고등/성인 중 하나여야 합니다.`);
      return;
    }
    if (!Number.isFinite(gradeNumber) || gradeNumber < 1) {
      errors.push(`${line}행: 학년은 1 이상의 숫자여야 합니다.`);
      return;
    }
    rows.push({
      displayName,
      phone,
      schoolLevel: school,
      gradeNumber: Math.floor(gradeNumber),
    });
  });

  return { rows, errors };
}
