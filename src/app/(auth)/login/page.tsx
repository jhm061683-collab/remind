import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { RemindLogo } from "@/components/brand/remind-logo";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";

type Props = {
  searchParams: Promise<{ reason?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { reason } = await searchParams;

  return (
    <>
      <div className="mb-8 flex justify-center">
        <RemindLogo href="/" size="lg" />
      </div>

      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">로그인</h1>
        <p className="mt-2 text-sm text-slate-500">
          역할에 맞는 화면으로 자동 이동합니다.
        </p>
      </div>

      {reason === "stale-session" ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          클라우드 모드로 전환되어 다시 로그인해 주세요.
        </p>
      ) : reason === "expired" ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          로그인이 만료되었습니다. 다시 로그인해 주세요.
        </p>
      ) : null}

      <LoginForm />

      <div className="mt-4">
        <InstallAppPrompt variant="button" />
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/" className="font-medium text-blue-600 hover:underline">
          ← 메인으로
        </Link>
      </p>
    </>
  );
}
