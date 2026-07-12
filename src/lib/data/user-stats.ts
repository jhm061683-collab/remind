import { getActivityEvents } from "@/lib/data/activity";
import { getAllQuestions } from "@/lib/data/questions";
import { computeUserStats, type UserStats } from "@/lib/stats/compute";

export async function getUserStats(userId: string): Promise<UserStats> {
  const [questions, events] = await Promise.all([
    getAllQuestions(userId),
    getActivityEvents(userId),
  ]);
  return computeUserStats(questions, events);
}

export type { UserStats, AchievementProgress, WeeklyReport } from "@/lib/stats/compute";
