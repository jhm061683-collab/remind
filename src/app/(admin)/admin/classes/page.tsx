import { Suspense } from "react";
import { ClassManagementBoard } from "@/components/admin/class-management-board";
import { AdminSettingsTabs } from "@/components/admin/admin-settings-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/server/admin/auth";
import { getClassManagementData } from "@/lib/server/admin/queries";

type Props = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function AdminClassesPage({ searchParams }: Props) {
  const session = await requireAdmin();
  const params = (await searchParams) ?? {};
  const data = await getClassManagementData(session.id);
  const tab = params.tab === "add" ? "add" : "list";

  return (
    <>
      <PageHeader
        title="반 설정"
        description="반 추가 · 명단·담당 선생님 배정"
      />
      <Suspense fallback={null}>
        <AdminSettingsTabs
          tabs={[
            { id: "list", label: "목록" },
            { id: "add", label: "추가" },
          ]}
          defaultTab="list"
        />
      </Suspense>
      <ClassManagementBoard data={data} section={tab} />
    </>
  );
}
