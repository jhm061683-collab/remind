import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_PACKET_MATH_SPACING,
  DEFAULT_PACKET_PDF_ITEM_GAP,
  ITEM_GAP_PT,
  PACKET_ANSWER_MATH_CSS,
  QUICK_ANSWER_MATH_FIXTURES,
  findVerticallyClippedMathCells,
  isMathCellVerticallyComfortable,
  itemGapToPreviewPx,
  toPdfDownloadFileName,
  normalizePacketPdfSettings,
  packetLayoutGapFromSettings,
  runExclusiveDownload,
} from "./packet-pdf-settings.ts";

describe("normalizePacketPdfSettings", () => {
  it("빈 입력은 기본 문항 간격을 쓴다", () => {
    const settings = normalizePacketPdfSettings();
    assert.equal(settings.itemGap, DEFAULT_PACKET_PDF_ITEM_GAP);
    assert.equal(settings.mathSpacing, DEFAULT_PACKET_MATH_SPACING);
  });

  it("레거시 수학 여백 필드를 무시한다", () => {
    const settings = normalizePacketPdfSettings({
      itemGap: "loose",
      mathSpacing: "loose",
      mathDensity: "dense",
      mathSolveSpace: "wide",
      solveSpaceMode: "compact",
    });
    assert.equal(settings.itemGap, "loose");
    assert.equal(settings.mathSpacing, DEFAULT_PACKET_MATH_SPACING);
  });

  it("questionGap/problemGap 별칭도 itemGap으로 읽는다", () => {
    assert.equal(
      normalizePacketPdfSettings({ questionGap: "tight" }).itemGap,
      "tight",
    );
    assert.equal(
      normalizePacketPdfSettings({ problemGap: "loose" }).itemGap,
      "loose",
    );
  });
});

describe("packet layout gap wiring", () => {
  it("문항 간격이 수학·국어 레이아웃에 같은 pt로 전달된다", () => {
    for (const itemGap of ["tight", "normal", "loose"] as const) {
      const settings = normalizePacketPdfSettings({ itemGap });
      const patch = packetLayoutGapFromSettings(settings);
      assert.equal(patch.math.blockGapPt, ITEM_GAP_PT[itemGap]);
      assert.equal(patch.korean.questionGapPt, ITEM_GAP_PT[itemGap]);
      assert.ok(itemGapToPreviewPx(itemGap) > 0);
    }
  });
});

describe("quick answer math fixtures", () => {
  it("클리핑 회귀용 식을 모두 포함한다", () => {
    assert.deepEqual([...QUICK_ANSWER_MATH_FIXTURES], [
      "2x-y=0",
      "(10,0)",
      "\\frac{\\sqrt{5}}{2}",
      "\\sqrt{29}",
      "x^2+y^2=1",
      "a_1+a_2",
      "\\frac{a+b}{2}",
    ]);
  });

  it("공통 수식 셀은 overflow visible 과 자동 높이를 쓴다", () => {
    assert.match(PACKET_ANSWER_MATH_CSS, /overflow:\s*visible/);
    assert.match(PACKET_ANSWER_MATH_CSS, /height:\s*auto/);
    assert.match(PACKET_ANSWER_MATH_CSS, /\.packet-answer-math-cell/);
    assert.match(PACKET_ANSWER_MATH_CSS, /\.packet-answer-plain-cell/);
    assert.match(PACKET_ANSWER_MATH_CSS, /padding-top:\s*14px/);
    assert.match(PACKET_ANSWER_MATH_CSS, /padding-bottom:\s*16px/);
    assert.doesNotMatch(
      PACKET_ANSWER_MATH_CSS.replace(/overflow:\s*visible !important;/g, ""),
      /overflow:\s*hidden/,
    );
  });
});

describe("math clip probe", () => {
  it("overflow hidden 이고 내용이 더 높으면 실패로 본다", () => {
    const clipped = findVerticallyClippedMathCells([
      { scrollHeight: 28, clientHeight: 16, overflowY: "hidden" },
      { scrollHeight: 20, clientHeight: 20, overflowY: "visible" },
    ]);
    assert.equal(clipped.length, 1);
  });

  it("overflow visible 이면 높이가 커도 통과한다", () => {
    const clipped = findVerticallyClippedMathCells([
      { scrollHeight: 40, clientHeight: 18, overflowY: "visible" },
    ]);
    assert.equal(clipped.length, 0);
  });

  it("수식 셀은 위아래 8px 이상이어야 편하다", () => {
    assert.equal(
      isMathCellVerticallyComfortable({ topGap: 12, bottomGap: 14 }),
      true,
    );
    assert.equal(
      isMathCellVerticallyComfortable({ topGap: 3, bottomGap: 14 }),
      false,
    );
  });
});

describe("download lifecycle", () => {
  it("같은 파일명도 .pdf 확장자를 유지한다", () => {
    assert.equal(toPdfDownloadFileName("학생_오답모음.pdf"), "학생_오답모음.pdf");
    assert.equal(toPdfDownloadFileName("학생_오답모음"), "학생_오답모음.pdf");
  });

  it("성공하면 lock이 풀려 연속 다운로드가 가능하다", async () => {
    const lock = { current: false };
    await runExclusiveDownload(lock, async () => "one");
    const second = await runExclusiveDownload(lock, async () => "two");
    const third = await runExclusiveDownload(lock, async () => "three");
    assert.equal(second, "two");
    assert.equal(third, "three");
    assert.equal(lock.current, false);
  });

  it("실패 후에도 lock이 풀려 재시도할 수 있다", async () => {
    const lock = { current: false };
    await assert.rejects(
      () =>
        runExclusiveDownload(lock, async () => {
          throw new Error("forced");
        }),
      /forced/,
    );
    assert.equal(lock.current, false);
    const retry = await runExclusiveDownload(lock, async () => "ok");
    assert.equal(retry, "ok");
  });

  it("진행 중이면 새 다운로드를 거부한다", async () => {
    const lock = { current: true };
    await assert.rejects(
      () => runExclusiveDownload(lock, async () => "nope"),
      /PDF_DOWNLOAD_IN_PROGRESS/,
    );
  });
});
