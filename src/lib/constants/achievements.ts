export type AchievementId =
  | "first_review"
  | "registered_10"
  | "registered_30"
  | "review_50"
  | "archived_10"
  | "streak_7"
  | "streak_30";

export type AchievementDef = {
  id: AchievementId;
  title: string;
  description: string;
  target: number;
  metric: "registered" | "reviewed" | "archived" | "streak";
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_review",
    title: "첫 복습",
    description: "첫 문제를 복습했어요",
    target: 1,
    metric: "reviewed",
  },
  {
    id: "registered_10",
    title: "10문제 등록",
    description: "오답 10문제를 정리했어요",
    target: 10,
    metric: "registered",
  },
  {
    id: "registered_30",
    title: "30문제 등록",
    description: "꾸준히 쌓고 있어요",
    target: 30,
    metric: "registered",
  },
  {
    id: "review_50",
    title: "복습 50회",
    description: "50번 복습을 완료했어요",
    target: 50,
    metric: "reviewed",
  },
  {
    id: "archived_10",
    title: "10문제 정복",
    description: "10문제를 보관함에 넣었어요",
    target: 10,
    metric: "archived",
  },
  {
    id: "streak_7",
    title: "7일 연속",
    description: "7일 연속 복습했어요",
    target: 7,
    metric: "streak",
  },
  {
    id: "streak_30",
    title: "30일 연속",
    description: "한 달 내내 복습했어요",
    target: 30,
    metric: "streak",
  },
];
