import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const rows = [
    { 이름: "홍길동", 휴대폰: "01012345678", 학교급: "중등", 학년: 2 },
    { 이름: "김하늘", 휴대폰: "01099998888", 학교급: "고등", 학년: 1 },
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "학생일괄등록");
  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(out, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="students-template.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
