import Link from "next/link";
import { DirectorJoinForm } from "@/components/platform/director-join-form";
import { RemindLogo } from "@/components/brand/remind-logo";
import { getPublicInvite } from "@/lib/server/platform/queries";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function JoinInvitePage({ params }: Props) {
  const { token } = await params;
  const { invite, error } = await getPublicInvite(token);

  return (
    <>
      <div className="mb-8 flex justify-center">
        <RemindLogo href="/" size="lg" />
      </div>

      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">원장 가입</h1>
        <p className="mt-2 text-sm text-slate-500">
          초대 링크로 학원과 원장 계정을 만듭니다. 카드 정보는 받지 않습니다.
        </p>
      </div>

      {error || !invite ? (
        <div className="remind-card space-y-3 p-4 md:p-6">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {error ?? "초대 링크를 확인할 수 없습니다."}
          </p>
          <p className="text-center text-sm text-slate-500">
            <Link href="/login" className="font-medium text-blue-600 hover:underline">
              로그인으로
            </Link>
          </p>
        </div>
      ) : (
        <DirectorJoinForm invite={invite} />
      )}
    </>
  );
}
