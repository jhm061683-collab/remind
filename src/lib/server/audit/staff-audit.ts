import { headers } from "next/headers";
import { createServiceClient, isServiceRoleConfigured } from "@/lib/supabase/service";

export type StaffAuditEvent = {
  actorId: string;
  targetUserId: string;
  academyId: string | null;
  action: string;
  success: boolean;
  source?: string;
};

/** 비밀번호 값은 절대 받지 않는다. 테이블이 없으면 조용히 건너뛴다. */
export async function logStaffAudit(event: StaffAuditEvent): Promise<void> {
  let source = event.source ?? "admin-ui";
  try {
    const headerList = await headers();
    const referer = headerList.get("referer");
    if (referer) {
      try {
        source = new URL(referer).pathname;
      } catch {
        source = "admin-ui";
      }
    }
  } catch {
    // headers() 밖에서 호출되면 기본 source 유지
  }

  const payload = {
    actor_id: event.actorId,
    target_user_id: event.targetUserId,
    academy_id: event.academyId,
    action: event.action,
    success: event.success,
    source,
    created_at: new Date().toISOString(),
  };

  console.info(
    `[staff-audit] action=${event.action} success=${event.success} actor=${event.actorId} target=${event.targetUserId}`,
  );

  if (!isServiceRoleConfigured()) return;
  const supabase = createServiceClient();
  const { error } = await supabase.from("staff_audit_events").insert(payload);
  if (error && !/staff_audit_events|schema cache|does not exist/i.test(error.message)) {
    console.info("[staff-audit] persist skipped");
  }
}
