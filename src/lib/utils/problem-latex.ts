/** 공통 지문 + 문항 본문을 저장용 문자열로 합친다. */
export function composeProblemLatex(
  sharedPassage: string,
  problemLatex: string,
): string {
  const passage = sharedPassage.trim();
  const body = problemLatex.trim();
  if (!passage) return body;
  if (!body) return passage;
  return `${passage}\n\n${body}`;
}
