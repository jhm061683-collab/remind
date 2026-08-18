"use client";

import { useEffect, useState } from "react";
import { buildWrongNotePacketPdfBlob } from "@/components/admin/wrong-note-packet-pdf";
import { MathAnswerView } from "@/components/math/math-answer-view";
import type { WrongNotePacketData } from "@/lib/server/admin/wrong-note-packet";
import { isMathHeavyContent } from "@/lib/utils/packet-content";
import {
  PACKET_ANSWER_MATH_CSS,
  QUICK_ANSWER_MATH_FIXTURES,
  triggerPdfBlobDownload,
} from "@/lib/utils/packet-pdf-settings";

type PacketPdfQaApi = {
  buildWrongNotePacketPdfBlob: typeof buildWrongNotePacketPdfBlob;
  runWithData: (
    data: WrongNotePacketData,
    opts?: { downloadName?: string; skipPreview?: boolean },
  ) => Promise<{
    ok: boolean;
    pageCount?: number;
    base64?: string;
    error?: string;
  }>;
};

declare global {
  interface Window {
    __packetPdfQa?: PacketPdfQaApi;
  }
}

/** 로컬/개발 QA 전용 — 프로덕션에서는 안내만 표시 */
const IS_PROD =
  typeof process !== "undefined" && process.env.NODE_ENV === "production";

/** 로컬 QA 전용 픽스처 — 수학 수식 + 긴 국어/영어 지문 */
const OJONGTAEK_APC_LATEX = `길이가 $6$인 선분 $\\text{AB}$를 $1:2$로 내분하는 점을 $\\text{C}$라 할 때, 두 점 $\\text{P}$, $\\text{Q}$가 $1 < r < 2$인 상수 $r$에 대하여 다음 조건을 만족시킨다.

$$\\begin{aligned}
&\\text{(가) } \\sin(\\angle\\text{APC}) = \\frac{1}{r},\\ \\sin(\\angle\\text{BQC}) = \\frac{2}{4-r} \\\\
&\\text{(나) 삼각형 } \\text{APC}\\text{의 외심과 삼각형 } \\text{BQC}\\text{의 외심 사이의} \\\\
&\\quad\\ \\ \\text{거리는 } 4\\text{이다.}
\\end{aligned}$$

네 점 $\\text{A}$, $\\text{B}$, $\\text{P}$, $\\text{Q}$를 꼭짓점으로 하는 사각형의 넓이의 최댓값이 $p + q\\sqrt{7}$일 때, $p+q$의 값을 구하시오. (단, $p$와 $q$는 유리수이다.) [4점]`;

/** 실제 저장소에 올라가 있는 문항 그림 — figure placeholder 회귀 검증용 */
const FIXTURE_FIGURE_URL =
  "https://llukfoyxkwbqevxgsssq.supabase.co/storage/v1/object/public/question-images/8f5c709b-8ddd-4266-a3af-cb1458d3ef26/1785591957527-question.jpg";

const FIXTURE: WrongNotePacketData = {
  academyName: "QA학원",
  studentName: "김학생",
  classLabel: "고2-수학",
  periodLabel: "최근 30일",
  periodStart: "2026-07-04",
  periodEnd: "2026-08-02",
  subjectFilterLabel: "전체",
  statusFilterLabel: "전체",
  phaseFilterLabel: "단기, 중기, 장기",
  generatedAtLabel: "2026-08-03",
  truncated: false,
  subjectOptions: [],
  items: [
    {
      id: "m1",
      number: 1,
      subjectId: "math",
      subjectName: "수학",
      createdAt: "2026-07-12T00:00:00+09:00",
      createdDateLabel: "2026-07-12",
      problemLatex:
        "수열 $\\{a_n\\}$의 첫째항부터 제$n$항까지의 합을 $S_n$이라 하자.\n$$S_{2n}+S_{2n-1}=n^2+2n,\\quad a_{2n}=-(n^2+2)$$\n일 때, $\\displaystyle\\sum_{n=1}^{18}(-1)^{n+1}\\times a_n$의 값을 구하시오. [4점]",
      imageUrls: [],
      answerText: "$171$",
      archived: false,
    },
    {
      id: "m2",
      number: 2,
      subjectId: "math",
      subjectName: "수학",
      createdAt: "2026-07-12T00:00:00+09:00",
      createdDateLabel: "2026-07-12",
      problemLatex:
        "함수 $f(x)=x^3-3x$에 대하여 $f'(a)=0$을 만족하는 실수 $a$의 개수는?",
      imageUrls: [],
      answerText: "2",
      archived: false,
    },
    {
      id: "m3",
      number: 3,
      subjectId: "math",
      subjectName: "수학",
      createdAt: "2026-07-13T00:00:00+09:00",
      createdDateLabel: "2026-07-13",
      problemLatex: OJONGTAEK_APC_LATEX,
      imageUrls: [],
      answerText: "$13$",
      archived: false,
    },
    {
      id: "m4",
      number: 4,
      subjectId: "math",
      subjectName: "수학",
      createdAt: "2026-07-14T00:00:00+09:00",
      createdDateLabel: "2026-07-14",
      problemLatex:
        "등차수열 $\\{a_n\\}$의 첫째항이 $3$, 공차가 $2$일 때, $\\displaystyle\\sum_{k=1}^{10}a_k$의 값은?",
      imageUrls: [],
      answerText: "120",
      archived: false,
    },
    {
      id: "m5",
      number: 5,
      subjectId: "math",
      subjectName: "수학",
      createdAt: "2026-07-18T00:00:00+09:00",
      createdDateLabel: "2026-07-18",
      problemLatex:
        "이차방정식 $x^2-4x+k=0$이 서로 다른 두 실근을 갖도록 하는 실수 $k$의 값의 범위는?",
      imageUrls: [],
      answerText: "$k<4$",
      archived: false,
    },
    {
      id: "m6",
      number: 6,
      subjectId: "math",
      subjectName: "수학",
      createdAt: "2026-07-19T00:00:00+09:00",
      createdDateLabel: "2026-07-19",
      // 문항 그림 토큰 + 평행 기호(LaTeX/유니코드 혼합) 회귀 픽스처
      problemLatex: `오른쪽 그림에서 두 점 $\\text{A}$, $\\text{B}$는 점 $\\text{P}$에서 원에 그은 두 접선의 접점이다. $\\overline{\\text{AD}} \\parallel \\overline{\\text{PB}}$이고 $\\angle\\text{P} = 58^\\circ$일 때, $\\angle\\text{BCD}$의 크기를 구하시오.

사다리꼴에서 AD ∥ BC 이고 AB ⊥ BC 이다.

[[FIGURE:${FIXTURE_FIGURE_URL}]]`,
      imageUrls: [],
      answerText: "\\frac{\\sqrt{5}}{2}",
      archived: false,
    },
    {
      id: "m7",
      number: 7,
      subjectId: "math",
      subjectName: "수학",
      createdAt: "2026-07-20T00:00:00+09:00",
      createdDateLabel: "2026-07-20",
      problemLatex:
        "두 점 $\\text{C}(\\sqrt{2},\\ p)$, $\\text{D}(3\\sqrt{2},\\ q)$를 지나는 직선의 방정식을 구하시오.",
      imageUrls: [],
      // 「또는」으로 연결된 복수 정답 + 변수 x, y
      answerText: "3x-2y-26=0 또는 3x-2y+26=0",
      archived: false,
    },
    {
      id: "m8",
      number: 8,
      subjectId: "math",
      subjectName: "수학",
      createdAt: "2026-07-21T00:00:00+09:00",
      createdDateLabel: "2026-07-21",
      problemLatex:
        "이차함수 $y = x^2$의 그래프 위의 점 $\\text{P}(1,\\ 1)$에서의 접선의 기울기를 구하시오.",
      imageUrls: [],
      // 느슨한 분수 표기 회귀 픽스처
      answerText: "frac(5)2",
      archived: false,
    },
    {
      id: "m9",
      number: 9,
      subjectId: "math",
      subjectName: "수학",
      createdAt: "2026-07-22T00:00:00+09:00",
      createdDateLabel: "2026-07-22",
      problemLatex: "다음 값을 구하시오. $\\sqrt{2} + \\pi$",
      imageUrls: [],
      answerText: "미등록",
      archived: false,
    },
    {
      id: "m10",
      number: 10,
      subjectId: "math",
      subjectName: "수학",
      createdAt: "2026-07-23T00:00:00+09:00",
      createdDateLabel: "2026-07-23",
      problemLatex: "삼각형 $\\text{ABC}$의 넓이를 구하시오.",
      imageUrls: [],
      answerText: "***",
      archived: false,
    },
    {
      id: "k1",
      number: 11,
      subjectId: "korean",
      subjectName: "국어",
      createdAt: "2026-07-15T00:00:00+09:00",
      createdDateLabel: "2026-07-15",
      sharedPassage: `[1~2] 다음 글을 읽고 물음에 답하시오.

(가) 서양 철학에서는 전통적으로 진리의 인식이 행복한 삶을 보장한다고 여겼다. 대표적으로 고대의 에피쿠로스 학파는 행복이란 곧 괴로움에서 벗어난 평정심의 상태이며 괴로움의 주된 원인은 사물의 본모습인 본질을 인식하지 못하는 무지이므로, 행복에 이르려면 진리를 인식해야 한다고 보았다. 그러나 고대의 회의론자들은 평정심을 해치는 괴로움은 무지가 아니라 오히려 진리에 대한 집착에서 기인한다고 주장했다. 이들은 어떤 것도 확실한 진리로 단정하지 않는 태도야말로 마음의 동요를 잠재운다고 보았다.

이에 대해 회의론자들은 무지가 행위의 실천과 양립 가능하다고 답했다. 이에 따르면 '내게는 A가 B인 것처럼 보인다.'처럼 현상을 있는 그대로 수용할 뿐인 인식도 행위의 근거가 될 수 있다. 회의론자들은 이러한 인식의 사례로 관습이나 실용적 기술 등을 들고, 인간은 이에 기초하여 일상을 영위하며 무지를 겸허히 인정해야 한다고 보았다.

(나) 근세 유럽에서 코페르니쿠스에 의해 시작된 과학 혁명은 철학자들 사이에서 인간이 진리를 인식하여 무지에서 벗어날 수 있는지에 대한 논쟁을 다시 불러일으켰다. 데카르트는 방법적 회의를 통해 확실한 지식을 확보하려 했고, 감각에 의존하지 않는 이성의 명증성을 진리의 기준으로 삼았다. 반면 가상디는 경험과 가설의 검증을 통해 잠정적 진리에 이를 수 있다고 보았다.

가상디는 이렇게 얻은 인식은 명백한 반대 증거가 발견되기 전까지는 진리라고 확신할 수 있으며, 이를 통해 무지에서 벗어날 수 있다고 생각했다. 가상디의 이러한 견해는 이후 근대 경험론의 형성에 중요한 토대를 제공했다는 점에서 의의가 있다. 결국 진리와 행복, 인식과 실천의 관계는 시대마다 다른 방식으로 재구성되며, 그 논의는 오늘날의 지식 사회에서도 계속된다.`,
      problemLatex: `1. (가), (나)에 대한 설명으로 가장 적절한 것은?
① (가)는 행복을 위해 인간에게 요구되는 인식 태도를 설명하였고, (나)는 행복에 대한 상반된 견해를 설명하였다.
② (가)는 인식에 대한 바람직한 태도를 설명하였고, (나)는 해당 태도를 체득하기 위한 여러 방법의 장단점을 비교하였다.
③ (가)는 특정 인식 태도에서 초래되는 문제점을 지적하였고, (나)는 그 문제점을 해결하는 새로운 인식 태도를 제시하였다.
④ (가)는 인식의 종류를 인식의 태도에 따라 분류하였고, (나)는 각 인식이 행복에 미치는 영향을 분석하였다.
⑤ (가)는 진리 인식과 행복의 관계를 둘러싼 대립을 소개하였고, (나)는 근대에 그 논의가 재점화된 양상을 설명하였다.`,
      imageUrls: [],
      answerText: "⑤",
      archived: false,
    },
    {
      id: "k2",
      number: 12,
      subjectId: "korean",
      subjectName: "국어",
      createdAt: "2026-07-15T00:00:00+09:00",
      createdDateLabel: "2026-07-15",
      problemLatex: `윗글을 바탕으로 <보기>의 ㉠에 대해 이해한 내용으로 적절하지 않은 것은?

<보기>
㉠ 어떤 철학자는 인식의 확실성을 확보하기 위해 감각 자료를 배제하고 이성의 명증성만을 진리의 기준으로 삼아야 한다고 주장했다. 그러나 다른 철학자는 경험과 가설의 검증을 통해 잠정적 진리에 이를 수 있다고 보았으며, 반대 증거가 나타나기 전까지는 그 인식을 진리로 확신할 수 있다고 했다. 이러한 대립은 이후 근대 인식론의 흐름을 형성하는 데 중요한 계기가 되었다.

① ㉠의 전자는 데카르트의 방법적 회의와 연결된다.
② ㉠의 후자는 가상디의 경험주의적 태도와 연결된다.
③ ㉠은 (나)에서 제기된 근대의 인식론 논쟁을 요약한다.
④ ㉠의 두 입장은 모두 감각을 진리의 유일한 기준으로 삼는다.
⑤ ㉠은 진리 인식의 가능성과 방법에 대한 상반된 견해를 대비한다.`,
      imageUrls: [],
      answerText: "④",
      archived: false,
    },
    {
      id: "k3",
      number: 13,
      subjectId: "korean",
      subjectName: "국어",
      createdAt: "2026-07-16T00:00:00+09:00",
      createdDateLabel: "2026-07-16",
      problemLatex: `다음 중 문장의 짜임이 나머지와 다른 것은?
① 비가 오자 아이들이 집으로 뛰어갔다.
② 형이 책을 읽으며 동생이 그림을 그렸다.
③ 친구가 선물을 주어서 나는 기뻤다.
④ 엄마가 음식을 만들고 아빠가 상을 차렸다.
⑤ 선생님이 설명을 하시고 학생들이 필기를 했다.`,
      imageUrls: [],
      answerText: "③",
      archived: false,
    },
    {
      id: "e1",
      number: 14,
      subjectId: "english",
      subjectName: "영어",
      createdAt: "2026-07-16T00:00:00+09:00",
      createdDateLabel: "2026-07-16",
      problemLatex: `Read the passage and answer the question.

Many students believe that effective learning depends mainly on long hours of study. However, research in cognitive science suggests that how we study often matters more than how long we study. Techniques such as spaced repetition, retrieval practice, and interleaving can improve long-term retention even when total study time is reduced.

Spaced repetition means reviewing material after increasing intervals instead of cramming the night before an exam. Retrieval practice requires learners to recall information without looking at notes, which strengthens memory traces. Interleaving mixes different types of problems so that students learn to choose appropriate strategies rather than repeating the same procedure mechanically.

These methods may feel more difficult in the short term, which is why some learners avoid them. Yet productive difficulty can lead to deeper understanding. Teachers who explain the purpose of such strategies help students tolerate temporary frustration and stay motivated.

What is the main idea of the passage?
① Longer study hours always produce better results.
② Cognitive science rejects all traditional study habits.
③ Study methods can matter more than total study time.
④ Teachers should avoid challenging tasks in class.
⑤ Cramming is the most efficient way to prepare for exams.`,
      imageUrls: [],
      answerText: "③",
      archived: false,
    },
  ],
};

type PagePreview = {
  page: number;
  dataUrl: string;
  width: number;
  height: number;
};

export default function PacketPdfQaPage() {
  const [status, setStatus] = useState("대기");
  const [previews, setPreviews] = useState<PagePreview[]>([]);
  const [checks, setChecks] = useState<string[]>([]);

  async function runWithData(
    data: WrongNotePacketData,
    opts?: { downloadName?: string; skipPreview?: boolean },
  ): Promise<{
    ok: boolean;
    pageCount?: number;
    base64?: string;
    error?: string;
  }> {
    setStatus("PDF 생성 중…");
    setPreviews([]);
    setChecks([]);

    const checksLocal: string[] = [];
    const mathCount = data.items.filter((i) =>
      isMathHeavyContent(i.problemLatex),
    ).length;
    checksLocal.push(`수학(수식) 문항 ${mathCount}개 → KaTeX 캡처 대상`);
    checksLocal.push(
      `지문 문항 ${data.items.length - mathCount}개 → 텍스트 조판 대상`,
    );
    checksLocal.push(`학생 ${data.studentName} · 문항 ${data.items.length}개`);

    try {
      const blob = await buildWrongNotePacketPdfBlob(data, (p) =>
        setStatus(`${p.label} (${p.percent}%)`),
      );

      const buf = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]!);
      const base64 = btoa(binary);

      triggerPdfBlobDownload(
        blob,
        opts?.downloadName ?? "packet-qa-verify.pdf",
      );

      let pages: PagePreview[] = [];
      if (!opts?.skipPreview) {
        setStatus("미리보기 렌더 중…");
        pages = await renderPdfPages(blob);
        setPreviews(pages);

        for (const p of pages) {
          if (p.width < 40) {
            checksLocal.push(`FAIL: page ${p.page} width collapsed`);
          }
        }
        if (pages.length < 3) {
          checksLocal.push(
            `WARN: 페이지 수 ${pages.length} (표지+문제+빠른정답 최소 3 권장)`,
          );
        } else {
          checksLocal.push(`OK: 페이지 수 ${pages.length}`);
        }
      } else {
        checksLocal.push("OK: 미리보기 생략 (스크립트 모드)");
      }

      checksLocal.push("OK: PDF blob 생성 완료");
      setChecks(checksLocal);
      setStatus("완료 — 아래 미리보기를 확인하세요");
      return { ok: true, pageCount: pages.length || undefined, base64 };
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setStatus(`실패: ${message}`);
      setChecks([...checksLocal, `FAIL: ${message}`]);
      return { ok: false, error: message };
    }
  }

  useEffect(() => {
    if (IS_PROD || typeof window === "undefined") return;
    window.__packetPdfQa = {
      buildWrongNotePacketPdfBlob,
      runWithData,
    };
    return () => {
      delete window.__packetPdfQa;
    };
  });

  if (IS_PROD) {
    return (
      <main className="mx-auto max-w-lg p-8 text-sm text-slate-600">
        이 페이지는 개발용 QA 도구라서 프로덕션에서는 사용할 수 없어요.
      </main>
    );
  }

  async function runQa() {
    await runWithData(FIXTURE);
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-xl font-bold">오답 모음 PDF QA</h1>
      <p className="text-sm text-slate-600">
        픽스처(수학 수식 + 국어/영어 지문)로 PDF를 만들고 페이지 미리보기를
        띄웁니다.
      </p>
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold">빠른정답 수식 clipping 픽스처</h2>
        <style>{PACKET_ANSWER_MATH_CSS}</style>
        <table
          className="mt-2 w-full border-collapse text-[11px]"
          data-testid="quick-answer-math-fixtures"
        >
          <thead>
            <tr className="border-b border-slate-300 text-left">
              <th className="w-8 py-1">번호</th>
              <th className="w-14 py-1">과목</th>
              <th className="py-1">정답</th>
            </tr>
          </thead>
          <tbody>
            {QUICK_ANSWER_MATH_FIXTURES.map((expr, i) => (
              <tr key={expr} className="border-b border-slate-100">
                <td className="py-1.5 font-semibold">{i + 1}</td>
                <td className="py-1.5 text-slate-600">수학</td>
                <td
                  className={
                    /\\frac|\\sqrt/.test(expr)
                      ? "packet-answer-math-cell packet-answer-math-cell--tall"
                      : "packet-answer-math-cell"
                  }
                >
                  <MathAnswerView
                    content={expr}
                    answerCell
                    className="text-[11px] text-slate-900"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <button
        type="button"
        data-testid="run-packet-pdf-qa"
        onClick={() => void runQa()}
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
      >
        QA PDF 생성
      </button>
      <p className="text-sm font-medium" data-testid="qa-status">
        {status}
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm" data-testid="qa-checks">
        {checks.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="space-y-4" data-testid="qa-previews">
        {previews.map((p) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={p.page}
            src={p.dataUrl}
            alt={`PDF page ${p.page}`}
            className="w-full border border-slate-200 bg-white shadow-sm"
            data-qa-page={p.page}
          />
        ))}
      </div>
    </main>
  );
}

async function renderPdfPages(blob: Blob): Promise<PagePreview[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;

  const data = new Uint8Array(await blob.arrayBuffer());
  const doc = await pdfjs.getDocument({
    data,
    useSystemFonts: true,
  }).promise;
  const pages: PagePreview[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.35 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;
    pages.push({
      page: i,
      dataUrl: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
    });
  }
  return pages;
}
