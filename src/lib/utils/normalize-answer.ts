const LATEX_CMD =
  /\\(frac|sqrt|log|ln|pi|infty|cdot|times|div|pm|leq|geq|neq|left|right)/;

/** 저장된 정답이 LaTeX 수식인지 */
export function isLatexAnswer(raw: string): boolean {
  const text = raw.trim();
  if (!text) return false;
  if (LATEX_CMD.test(text)) return true;
  // $...$ 안에 지수·아래첨자·명령이 있으면 수식으로 본다
  if (/^\$/.test(text) && /(\\|[\^_])/.test(text)) return true;
  return false;
}

/** LaTeX 정답 → 학생이 다시 고치기 쉬운 표기 */
export function latexToFriendly(raw: string): string {
  let s = raw.trim();
  if (!s) return "";
  s = s.replace(/^\$\$([\s\S]*)\$\$$/, "$1").replace(/^\$([^$]*)\$$/, "$1");
  s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1/$2)");
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, "√($1)");
  s = s.replace(/\\log_\{([^{}]+)\}\{([^{}]+)\}/g, "log_$1($2)");
  s = s.replace(/\\log\{([^{}]+)\}/g, "log($1)");
  s = s.replace(/\\ln\{([^{}]+)\}/g, "ln($1)");
  s = s.replace(/\\pi/g, "π");
  s = s.replace(/\^\{([^{}]+)\}/g, "^$1");
  s = s.replace(/\$/g, "");
  return s.trim();
}

/**
 * 쉬운 표기 → 저장용 LaTeX.
 * 예: (1/2)x^2+2x, log_2(8), √(x+1), 1/10
 */
export function convertFriendlyAnswer(raw: string): string {
  const text = raw.trim();
  if (!text) return "";
  if (LATEX_CMD.test(text)) {
    return normalizeAnswerText(text);
  }

  let s = text;

  s = s.replace(/π/g, "\\pi");

  s = s.replace(/ln\s*\(\s*([^)]+?)\s*\)/gi, (_m, a: string) => `\\ln{${a.trim()}}`);
  s = s.replace(
    /log\s*_?\s*([A-Za-z0-9]+)\s*\(\s*([^)]+?)\s*\)/gi,
    (_m, base: string, arg: string) => `\\log_{${base}}{${arg.trim()}}`,
  );
  s = s.replace(
    /log\s*_\{\s*([^}]+?)\s*\}\s*\(\s*([^)]+?)\s*\)/gi,
    (_m, base: string, arg: string) => `\\log_{${base.trim()}}{${arg.trim()}}`,
  );
  s = s.replace(
    /log\s*\(\s*([^)]+?)\s*\)/gi,
    (_m, arg: string) => `\\log{${arg.trim()}}`,
  );

  s = s.replace(/√\s*\(\s*([^)]+?)\s*\)/g, (_m, a: string) => `\\sqrt{${a.trim()}}`);
  s = s.replace(/√\s*([A-Za-z0-9]+)/g, (_m, a: string) => `\\sqrt{${a}}`);
  s = s.replace(
    /sqrt\s*\(\s*([^)]+?)\s*\)/gi,
    (_m, a: string) => `\\sqrt{${a.trim()}}`,
  );

  // (1/2), (x+1)/(x-1) 등 괄호 분수
  s = s.replace(
    /\(\s*([^()/]+?)\s*\/\s*([^()/]+?)\s*\)/g,
    (_m, num: string, den: string) => `\\frac{${num.trim()}}{${den.trim()}}`,
  );
  // 단독 숫자 분수 1/10 (식 중간·앞)
  s = s.replace(
    /(^|[^0-9A-Za-z)\\}])(-?\d+)\s*\/\s*(-?\d+)(?![0-9A-Za-z])/g,
    (_m, pre: string, num: string, den: string) =>
      `${pre}\\frac{${num}}{${den}}`,
  );

  s = s.replace(/\^\(\s*([^)]+?)\s*\)/g, (_m, e: string) => `^{${e.trim()}}`);
  s = s.replace(/\^(\d+)/g, "^{$1}");

  return normalizeAnswerText(s);
}

/**
 * 정답 문자열을 저장·표시용으로 다듬습니다.
 */
export function normalizeAnswerText(raw: string): string {
  let text = raw.trim();
  if (!text) return "";

  if (LATEX_CMD.test(text) || /\^{/.test(text) || /\\pi/.test(text)) {
    const alreadyWrapped =
      /^\$\$[\s\S]*\$\$$/.test(text) ||
      (/^\$/.test(text) && /\$$/.test(text));
    if (!alreadyWrapped) {
      text = `$${text}$`;
    }
    return text.slice(0, 400);
  }

  text = text.replace(/^\$\$([\s\S]*)\$\$$/, "$1").replace(/^\$([^$]*)\$$/, "$1");

  text = text
    .replace(/\^\{?\s*\\circ\s*\}?/gi, "°")
    .replace(/\\circ/gi, "°")
    .replace(/\^\{\s*\\?circ\s*\}/gi, "°")
    .replace(/\{\s*\\circ\s*\}/gi, "°")
    .replace(/\^°/g, "°")
    .replace(/\s+°/g, "°")
    .replace(/\$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return text.slice(0, 400);
}

/** 과목 id/이름 기준으로 수학 입력 도구를 쓸지 */
export function isMathAnswerSubject(
  subjectId: string,
  subjectName?: string,
): boolean {
  const id = subjectId.trim().toLowerCase();
  if (id === "math" || id.startsWith("math")) return true;
  const name = (subjectName ?? "").trim();
  return /수학|math/i.test(name) || /수학|math/i.test(id);
}

export function buildFracLatex(num: string, den: string): string {
  return normalizeAnswerText(
    `\\frac{${num.trim() || "?"}}{${den.trim() || "?"}}`,
  );
}

export function buildSqrtLatex(inner: string): string {
  return normalizeAnswerText(`\\sqrt{${inner.trim() || "?"}}`);
}

export function buildLogLatex(arg: string, base?: string): string {
  const a = arg.trim() || "?";
  if (base?.trim()) {
    return normalizeAnswerText(`\\log_{${base.trim()}}{${a}}`);
  }
  return normalizeAnswerText(`\\log{${a}}`);
}

export function buildPowLatex(base: string, exp: string): string {
  const b = base.trim() || "?";
  const e = exp.trim() || "?";
  return normalizeAnswerText(`${b}^{${e}}`);
}

/** 도우미가 식에 끼워 넣는 쉬운 조각 */
export function friendlyFracSnippet(num: string, den: string): string {
  return `(${num.trim()}/${den.trim()})`;
}

export function friendlySqrtSnippet(inner: string): string {
  return `√(${inner.trim()})`;
}

export function friendlyLogSnippet(arg: string, base?: string): string {
  const a = arg.trim();
  if (base?.trim()) return `log_${base.trim()}(${a})`;
  return `log(${a})`;
}

export function friendlyPowSnippet(base: string, exp: string): string {
  const b = base.trim();
  const e = exp.trim();
  if (b) return `${b}^${e}`;
  return `^${e}`;
}
