import { StudentHeader } from "@/components/layout/student-header";
import { StudentNav } from "@/components/layout/student-nav";
import { StudentThemeProvider } from "@/components/theme/student-theme-provider";
import { SubjectProvider } from "@/components/student/subject-provider";
import { StorageNotice } from "@/components/student/storage-notice";
import { StudentOnboarding } from "@/components/student/student-onboarding";
import { getSession } from "@/lib/auth/session";
import {
  DEFAULT_STUDENT_THEME,
  STUDENT_THEME_COOKIE,
  parseStudentThemeCookie,
} from "@/lib/theme/student-theme";
import { cookies } from "next/headers";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const userId = session?.id ?? "guest";
  const cookieStore = await cookies();
  const initialTheme =
    parseStudentThemeCookie(cookieStore.get(STUDENT_THEME_COOKIE)?.value) ??
    DEFAULT_STUDENT_THEME;

  return (
    <SubjectProvider userId={userId}>
      <StudentThemeProvider userId={userId} initialTheme={initialTheme}>
        <StudentHeader userName={session?.name ?? "학생"} />
        <div className="relative z-[1] mx-auto w-full max-w-4xl flex-1 px-3 py-2 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:px-5 md:py-3 md:pb-4">
          <StorageNotice />
          {children}
        </div>
        <StudentOnboarding userId={userId} />
        <StudentNav />
      </StudentThemeProvider>
    </SubjectProvider>
  );
}
