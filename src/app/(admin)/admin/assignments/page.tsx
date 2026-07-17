import { redirect } from "next/navigation";

/** 담당 배정은 반 관리로 통합됨 */
export default function AssignmentsPage() {
  redirect("/admin/classes");
}
