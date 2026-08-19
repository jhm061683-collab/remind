export type StudentListQuery = {
  q: string;
  className: string;
  grade: string;
  teacher: string;
  activity: string;
  assignment: "all" | "unassigned";
  page: number;
};

const ACTIVITY = new Set([
  "all",
  "due_today",
  "backlog",
  "inactive_7",
  "never_login",
  "inactive_or_never",
]);

export function parseStudentListQuery(
  searchParams: URLSearchParams | { get(name: string): string | null },
): StudentListQuery {
  const activityRaw = searchParams.get("activity") ?? "all";
  const pageRaw = Number.parseInt(searchParams.get("page") ?? "1", 10);
  return {
    q: (searchParams.get("q") ?? "").trim(),
    className: searchParams.get("class") ?? "all",
    grade: searchParams.get("grade") ?? "all",
    teacher: searchParams.get("teacher") ?? "all",
    activity: ACTIVITY.has(activityRaw) ? activityRaw : "all",
    assignment:
      searchParams.get("assignment") === "unassigned" ? "unassigned" : "all",
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  };
}

export function studentListHref(
  patch: Partial<StudentListQuery> & { scope?: string | null; tab?: string | null },
  current: StudentListQuery,
): string {
  const next: StudentListQuery = { ...current, ...patch };
  const params = new URLSearchParams();
  if (patch.tab && patch.tab !== "list") params.set("tab", patch.tab);
  if (patch.scope) params.set("scope", patch.scope);
  if (next.q) params.set("q", next.q);
  if (next.className !== "all") params.set("class", next.className);
  if (next.grade !== "all") params.set("grade", next.grade);
  if (next.teacher !== "all") params.set("teacher", next.teacher);
  if (next.activity !== "all") params.set("activity", next.activity);
  if (next.assignment !== "all") params.set("assignment", next.assignment);
  if (next.page > 1) params.set("page", String(next.page));
  const qs = params.toString();
  return qs ? `/admin/students?${qs}` : "/admin/students";
}
