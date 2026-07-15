import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const header = ["이름", "휴대폰", "학교급", "학년"];
  const examples = [
    ["홍길동", "01012345678", "중등", 2],
    ["김하늘", "01099998888", "고등", 1],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([header, ...examples]);

  // 휴대폰 열을 텍스트로 고정 (엑셀이 앞자리 0을 지우지 않게)
  for (let r = 2; r <= examples.length + 1; r += 1) {
    const addr = `B${r}`;
    const cell = ws[addr];
    if (cell) {
      cell.t = "s";
      cell.v = String(cell.v);
      cell.z = "@";
    }
  }
  ws["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 8 }, { wch: 6 }];
  XLSX.utils.book_append_sheet(wb, ws, "학생일괄등록");

  const guide = XLSX.utils.aoa_to_sheet([
    ["휴대폰 번호 작성 안내"],
    [""],
    ["엑셀은 앞에 0이 있는 번호를 숫자로 바꿔서 010… → 10… 으로 보일 수 있습니다."],
    ["아래 중 하나를 지켜 주세요."],
    ["1) 휴대폰 칸을 선택한 뒤 → 셀 서식 → 텍스트 로 바꾼 다음 번호를 입력"],
    ["2) 입력할 때 앞에 따옴표를 붙이기 예: '01012345678"],
    ["3) 하이픈 포함 입력 예: 010-1234-5678 (앱이 숫자만 읽어 처리합니다)"],
    [""],
    ["학교급은 초등 / 중등 / 고등 / 성인 중 하나만 적습니다."],
    ["이 안내 시트는 업로드 때 무시됩니다."],
  ]);
  guide["!cols"] = [{ wch: 72 }];
  XLSX.utils.book_append_sheet(wb, guide, "작성안내");

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
