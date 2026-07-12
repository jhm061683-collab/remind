import { createClient } from "@/lib/supabase/server";

export async function deleteQuestionOnServer(
  userId: string,
  questionId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", questionId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function deleteQuestionsBulkOnServer(
  userId: string,
  questionIds: string[],
): Promise<number> {
  if (questionIds.length === 0) return 0;

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("questions")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .in("id", questionIds);

  if (error) throw error;
  return count ?? questionIds.length;
}
