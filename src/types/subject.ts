export type ReviewPhase = "short" | "medium" | "long" | "completed";

export type ReviewSettings = {
  shortIntervalDays: number;
  shortStreakRequired: number;
  mediumIntervalDays: number;
  mediumStreakRequired: number;
  longIntervalDays: number;
  longStreakRequired: number;
};

export type Subject = {
  id: string;
  userId: string;
  name: string;
  reviewSettings: ReviewSettings;
};
