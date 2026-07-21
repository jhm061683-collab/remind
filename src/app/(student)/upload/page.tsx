import { Suspense } from "react";
import { BackBar } from "@/components/ui/back-bar";
import { PageHeader } from "@/components/ui/page-header";
import { UploadFormSection } from "@/components/student/upload-form-section";
import { getSession } from "@/lib/auth/session";

type Props = {
  searchParams: Promise<{ subject?: string }>;
};

function UploadFormFallback() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-24 rounded-2xl bg-[var(--rm-surface,#e2e8f0)]" />
      <div className="h-40 rounded-2xl bg-[var(--rm-surface,#e2e8f0)]" />
      <div className="h-12 rounded-xl bg-[var(--rm-surface,#e2e8f0)]" />
    </div>
  );
}

export default async function UploadPage({ searchParams }: Props) {
  const { subject } = await searchParams;
  const session = await getSession();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <BackBar href="/dashboard" label="홈" />
      <PageHeader
        title="문제 등록"
        description="사진 찍고, 정답만 적으면 끝이에요."
        compact
      />
      <Suspense fallback={<UploadFormFallback />}>
        <UploadFormSection
          userId={session?.id ?? "guest"}
          role={session?.role}
          defaultSubjectId={subject}
        />
      </Suspense>
    </div>
  );
}
