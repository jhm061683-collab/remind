import type { TourRole, TutorialDefinition } from "@/lib/tutorial/types";

export const TUTORIALS: TutorialDefinition[] = [
  {
    key: "student_home",
    version: 1,
    title: "처음 시작하기",
    role: "student",
    startPath: "/dashboard",
    matchPath: (pathname) => pathname === "/dashboard",
    steps: [
      {
        id: "character",
        target: "student-character",
        title: "내 캐릭터",
        description:
          "캐릭터는 랭킹과 홈에서 나를 나타내는 얼굴이에요. 눌러서 종·모자·배경을 고를 수 있어요.",
      },
      {
        id: "nav",
        target: "student-nav",
        title: "메뉴를 눌러 이동해요",
        description:
          "홈 · 등록 · 다시 풀기 · 보관함 네 가지로 오답 학습을 이어가요.",
      },
      {
        id: "today",
        target: "student-today-hero",
        title: "오늘 할 일",
        description:
          "오늘 다시 풀 문제 수와 밀린 복습을 여기서 바로 확인해요.",
      },
      {
        id: "study",
        target: "student-study-start",
        title: "다시 풀기 시작",
        description:
          "이 버튼을 누르면 오늘 볼 문제가 나와요. 답을 먼저 적고 정답을 확인해요.",
      },
      {
        id: "register",
        target: "student-nav-register",
        title: "틀린 문제 등록",
        description:
          "「등록」에서 사진을 찍거나 앨범에서 올려 오답을 저장해요.",
      },
      {
        id: "ranking",
        target: "student-ranking",
        title: "랭킹에서 성장 확인",
        description:
          "학습 점수로 순위가 올라가요. 내 순위 카드가 위에 있고, 캐릭터도 그대로 보여요.",
      },
      {
        id: "help",
        target: "student-help",
        title: "사용법이 궁금하면",
        description:
          "물음표를 누르면 사용법을 다시 볼 수 있고, 튜토리얼도 다시 시작할 수 있어요.",
      },
    ],
  },
  {
    key: "student_upload",
    version: 1,
    title: "문제 등록",
    role: "student",
    startPath: "/upload",
    matchPath: (pathname) => pathname === "/upload",
    steps: [
      {
        id: "photos",
        target: "student-upload-photos",
        title: "문제 사진을 올려요",
        description:
          "촬영하거나 앨범에서 고르세요. 글자가 잘 보이게 정면에서 찍어 주세요.",
      },
      {
        id: "camera",
        target: "student-upload-camera",
        title: "바로 촬영",
        description:
          "휴대폰이면 「촬영」을 눌러 틀린 문제를 바로 찍을 수 있어요.",
      },
      {
        id: "next",
        target: "student-upload-next",
        title: "다음은 정답",
        description:
          "사진을 올린 뒤 「다음」을 누르면 정답을 직접 입력해요. AI는 정답을 풀어 주지 않아요.",
      },
    ],
  },
  {
    key: "student_study",
    version: 1,
    title: "복습 방법",
    role: "student",
    startPath: "/study/today",
    matchPath: (pathname) => pathname === "/study/today",
    steps: [
      {
        id: "empty",
        target: "student-study-empty",
        title: "오늘 볼 문제",
        description:
          "오늘 다시 풀 문제가 여기 모여요. 없으면 문제를 먼저 등록해 보세요.",
      },
      {
        id: "problem",
        target: "student-study-problem",
        title: "문제를 먼저 봐요",
        description: "사진을 보고 스스로 풀어 본 다음, 답을 적어요.",
      },
      {
        id: "answer",
        target: "student-study-answer",
        title: "내 답을 적어요",
        description:
          "기억나는 답을 먼저 적어요. 정답은 「정답 확인」을 누른 뒤에만 보여요.",
      },
      {
        id: "reveal",
        target: "student-study-reveal",
        title: "정답 확인",
        description:
          "답을 먼저 적어야 「정답 확인」이 열려요. 정말 모르면 「잘 모르겠어요」로 정답을 봐요.",
      },
      {
        id: "grade",
        target: "student-study-self-eval",
        title: "스스로 채점",
        description:
          "정답을 본 뒤 맞았어요/틀렸어요를 고르면 다음 복습 날이 정해져요. 잘 모르겠다고 본 문제는 틀림으로 기록돼요.",
      },
    ],
  },
  {
    key: "admin_home",
    version: 1,
    title: "학원 운영 둘러보기",
    role: "admin",
    startPath: "/admin/dashboard",
    matchPath: (pathname) => pathname === "/admin/dashboard",
    steps: [
      {
        id: "nav",
        target: "admin-nav",
        title: "관리 메뉴",
        description:
          "대시보드 · 학생 · 반 · 선생님 · 알림으로 학원 운영을 나눠 볼 수 있어요.",
      },
      {
        id: "today",
        target: "staff-today-actions",
        title: "오늘 조치할 학생",
        description:
          "복습 밀림·미접속·미로그인 학생을 먼저 보고, 목록으로 바로 이동하세요. 「학원 전체/내 담당」은 보기 범위만 바뀌고 권한은 그대로입니다.",
      },
      {
        id: "kpi",
        target: "staff-today-kpi",
        title: "위험 학생 열기",
        description:
          "숫자를 누르면 그 조건의 학생 목록으로 바로 갑니다. 색만 보지 말고 문구와 인원 수를 함께 확인하세요.",
      },
      {
        id: "act",
        target: "staff-quick-actions",
        title: "상담·알림 시작",
        description:
          "상세·상담·알림·보고서로 바로 이어집니다. 투어 중에는 실제 발송·저장을 누르지 않아도 됩니다.",
      },
      {
        id: "students",
        target: "admin-nav-students",
        title: "학생 설정",
        description:
          "학생 추가, 반 배정, 학부모 보고서를 여기서 관리해요.",
      },
      {
        id: "classes",
        target: "admin-nav-classes",
        title: "반 · 선생님",
        description:
          "반을 만들고 담당 선생님을 지정하면, 선생님 화면에 담당 학생만 보여요.",
      },
      {
        id: "table",
        target: "admin-students-table",
        title: "학생 이름 클릭",
        description:
          "이름을 누르면 상담 요약과 오답 모음 PDF를 만들 수 있어요.",
      },
    ],
  },
  {
    key: "teacher_home",
    version: 1,
    title: "담당 학생 둘러보기",
    role: "sub_admin",
    startPath: "/admin/dashboard",
    matchPath: (pathname) => pathname === "/admin/dashboard",
    steps: [
      {
        id: "nav",
        target: "admin-nav",
        title: "선생님 메뉴",
        description:
          "대시보드에서 담당 학생을 보고, 학생·알림 메뉴로 이동해요.",
      },
      {
        id: "today",
        target: "staff-today-actions",
        title: "오늘 확인할 담당 학생",
        description:
          "내가 볼 수 있는 학생만 나와요. 주 담당과 공동 담당이 구분되어 표시됩니다.",
      },
      {
        id: "kpi",
        target: "staff-today-kpi",
        title: "복습 밀림 확인",
        description:
          "복습 밀림 숫자를 누르면 해당 담당 학생 목록으로 이동합니다.",
      },
      {
        id: "act",
        target: "staff-quick-actions",
        title: "상담 메모 또는 알림 초안",
        description:
          "학생 옆의 상담·알림으로 바로 이어져요. 투어에서는 초안만 보고 실제 발송은 하지 마세요.",
      },
      {
        id: "students",
        target: "admin-nav-students",
        title: "담당 학생",
        description: "학생 목록에서 이름을 누르면 상담과 오답 PDF로 이어져요.",
      },
      {
        id: "table",
        target: "admin-students-table",
        title: "상담 · 오답 PDF",
        description:
          "학생 이름을 누르면 학습 요약과 오답 모음 PDF를 만들 수 있어요.",
      },
    ],
  },
  {
    key: "staff_packet",
    version: 1,
    title: "오답 PDF 만들기",
    role: "admin",
    startPath: "/admin/students",
    matchPath: (pathname) =>
      pathname.startsWith("/admin/students/") &&
      pathname !== "/admin/students",
    steps: [
      {
        id: "packet",
        target: "admin-packet-pdf",
        title: "오답 모음 PDF",
        description:
          "기간과 과목을 고른 뒤 PDF를 받으면, 수업·숙제용 오답지를 바로 출력할 수 있어요.",
      },
    ],
  },
  {
    key: "teacher_packet",
    version: 1,
    title: "오답 PDF 만들기",
    role: "sub_admin",
    startPath: "/admin/students",
    matchPath: (pathname) =>
      pathname.startsWith("/admin/students/") &&
      pathname !== "/admin/students",
    steps: [
      {
        id: "packet",
        target: "admin-packet-pdf",
        title: "오답 모음 PDF",
        description:
          "담당 학생 상세에서 기간을 고르고 오답 모음 PDF를 받을 수 있어요.",
      },
    ],
  },
];

export function tutorialsForRole(role: TourRole): TutorialDefinition[] {
  return TUTORIALS.filter((tutorial) => tutorial.role === role);
}

export function tutorialByKey(key: string): TutorialDefinition | undefined {
  return TUTORIALS.find((tutorial) => tutorial.key === key);
}

export function findMatchingTutorials(
  role: TourRole,
  pathname: string,
): TutorialDefinition[] {
  return tutorialsForRole(role).filter((tutorial) =>
    tutorial.matchPath(pathname),
  );
}
