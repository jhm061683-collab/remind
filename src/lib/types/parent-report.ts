export type ParentReportQuestion = {
  id: string;
  subjectId: string;
  subjectName: string;
  source: string | null;
  wrongReason: string | null;
  reflectionMemo: string | null;
  phase: string;
  createdAt: string;
};

export type ParentReportSnapshot = {
  version: 1;
  title: string;
  academyName: string;
  studentName: string;
  gradeLabel: string | null;
  classNames: string[];
  teacherNames: string[];
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  summary: {
    totalQuestions: number;
    completedQuestions: number;
    completionRate: number;
    totalReviews: number;
  };
  bySubject: Array<{
    subjectId: string;
    subjectName: string;
    count: number;
    completed: number;
  }>;
  wrongReasons: Array<{ reason: string; count: number }>;
  questions: ParentReportQuestion[];
};

export type ParentReportPublicData = {
  snapshot: ParentReportSnapshot;
  expiresAt: string | null;
};
