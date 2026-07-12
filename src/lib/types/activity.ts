export type ActivityEventType = "registered" | "reviewed" | "archived";

export type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  questionId?: string;
  wrongReason?: string;
  createdAt: string;
};
