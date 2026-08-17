import { createServiceClient } from "@/lib/supabase/service";

export type StudentNotificationRow = {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

export async function getStudentNotifications(
  userId: string,
): Promise<StudentNotificationRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("admin_notifications")
    .select("id, title, body, is_read, created_at")
    .eq("target_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[student-notifications]", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    body: row.body as string,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at as string,
  }));
}

export async function markStudentNotificationsRead(
  userId: string,
  ids?: string[],
): Promise<void> {
  const supabase = createServiceClient();
  let query = supabase
    .from("admin_notifications")
    .update({ is_read: true })
    .eq("target_user_id", userId)
    .eq("is_read", false);

  if (ids?.length) {
    query = query.in("id", ids);
  }

  const { error } = await query;
  if (error) console.error("[student-notifications] mark read", error.message);
}

export async function countUnreadStudentNotifications(
  userId: string,
): Promise<number> {
  const supabase = createServiceClient();
  const { count, error } = await supabase
    .from("admin_notifications")
    .select("id", { count: "exact", head: true })
    .eq("target_user_id", userId)
    .eq("is_read", false);

  if (error) return 0;
  return count ?? 0;
}
