import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { RemindLogo } from "@/components/brand/remind-logo";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";

type Props = {
  searchParams: Promise<{
    reason?: string;
    joined?: string;
    code?: string;
    user?: string;
  }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { reason, joined, code, user } = await searchParams;

  return (
    <>
      <div className="mb-8 flex justify-center">
        <RemindLogo href="/" size="lg" />
      </div>

      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">로그인</h1>
        <p className="mt-2 text-sm text-slate-500">
          학원 코드 · 아이디 · 비밀번호로 로그인합니다.
        </p>
      </div>

      {joined === "1" ? (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          학원 계정이 만들어졌습니다.
          {code ? (
            <>
              {" "}
              학원 코드 <span className="font-mono font-semibold">{code}</span>
            </>
          ) : null}
          {user ? (
            <>
              , 아이디 <span className="font-mono font-semibold">{user}</span>
            </>
          ) : null}
          로 로그인해 주세요. 카드 등록은 나중에 결제할 때 합니다.
        </p>
      ) : null}

      {reason === "stale-session" ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          클라우드 모드로 전환되어 다시 로그인해 주세요.
        </p>
      ) : reason === "expired" ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          로그인이 만료되었습니다. 다시 로그인해 주세요.
        </p>
      ) : null}

      <LoginForm defaultAcademyCode={code} defaultUsername={user} />

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
