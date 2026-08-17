export type PatchBucket = "A" | "B" | "C";

export type PatchChange = {
  /** A=학생, B=선생님(중간관리자), C=원장(관리자) */
  bucket: PatchBucket;
  text: string;
};

export type PatchNote = {
  version: string;
  date: string;
  title: string;
  summary: string;
  changes: PatchChange[];
};

export type PatchViewerRole = "student" | "sub_admin" | "admin";

const BUCKET_LABEL: Record<PatchBucket, string> = {
  A: "학생",
  B: "선생님",
  C: "원장",
};

/** 역할별 열람 범위: 학생=A, 선생님=A+B, 원장=A+B+C */
export function bucketsForRole(role: PatchViewerRole): PatchBucket[] {
  if (role === "admin") return ["A", "B", "C"];
  if (role === "sub_admin") return ["A", "B"];
  return ["A"];
}

export function bucketLabel(bucket: PatchBucket): string {
  return BUCKET_LABEL[bucket];
}

export function filterPatchNotes(
  notes: PatchNote[],
  role: PatchViewerRole,
): Array<
  PatchNote & {
    visibleChanges: PatchChange[];
  }
> {
  const allowed = new Set(bucketsForRole(role));
  return notes
    .map((note) => ({
      ...note,
      visibleChanges: note.changes.filter((c) => allowed.has(c.bucket)),
    }))
    .filter((note) => note.visibleChanges.length > 0);
}

/**
 * 사용자에게 공개하는 업데이트 기록.
 * 기능을 배포할 때 최신 항목을 맨 위에 추가합니다.
 */
export const PATCH_NOTES: PatchNote[] = [
  {
    version: "2026.08.01",
    date: "2026년 8월 1일",
    title: "아바타 품종 · 랭킹 · 학원 알림",
    summary:
      "캐릭터 품종과 이번 달 전체 랭킹, 휴대폰 학원 알림을 추가하고 사진 인식을 더 안정적으로 만들었어요.",
    changes: [
      {
        bucket: "A",
        text: "동물 캐릭터마다 품종 3가지를 고를 수 있어요. (예: 고양이 · 삼색이/검정/턱시도)",
      },
      {
        bucket: "A",
        text: "문제 사진은 한 장에 문제 하나만, 세로로 반듯하게 찍도록 안내해요. 옆으로 찍었으면 「돌리기」로 세울 수 있어요.",
      },
      {
        bucket: "A",
        text: "홈에 이번 달 전체 랭킹(개인·반)이 바로 보여요. 지난달 명예의 전당은 「보기」를 눌러 확인해요.",
      },
      {
        bucket: "A",
        text: "학원 공지는 알림함에서 볼 수 있고, 휴대폰에서는 계정 설정에서 푸시 알림을 켜고 끌 수 있어요. (PC 웹에서는 제안하지 않아요)",
      },
      {
        bucket: "B",
        text: "알림 발송 시 알림을 켠 학생 휴대폰으로 푸시가 함께 가요.",
      },
      {
        bucket: "B",
        text: "학생 상세에서 상담용 스냅샷을 빠르게 보고, 학부모 공유 링크를 복사할 수 있어요.",
      },
      {
        bucket: "B",
        text: "이번 달 학습 점수 랭킹으로 학생·반 흐름을 한눈에 볼 수 있어요.",
      },
      {
        bucket: "C",
        text: "반 이미지를 등록·관리할 수 있어요.",
      },
      {
        bucket: "C",
        text: "학부모 안심 보고서를 일괄로 발급할 수 있어요.",
      },
      {
        bucket: "C",
        text: "학원 AI 이용량·학습 랭킹 현황을 대시보드에서 확인할 수 있어요.",
      },
      {
        bucket: "C",
        text: "학생들이 고른 아바타(품종) 선호 통계를 플랫폼에서 볼 수 있어요. (owner)",
      },
    ],
  },
  {
    version: "2026.07.18",
    date: "2026년 7월 18일",
    title: "첫 사용 안내와 원장 계정 복구",
    summary: "처음 쓰는 학생과 원장이 더 쉽게 시작할 수 있도록 다듬었어요.",
    changes: [
      {
        bucket: "A",
        text: "학생 첫 로그인 때 등록 → 다시 풀기 → 보관 순서를 안내해요.",
      },
      {
        bucket: "A",
        text: "상단 물음표 버튼에서 학생 사용 안내를 다시 볼 수 있어요.",
      },
      {
        bucket: "C",
        text: "원장 가입 시 비밀번호 복구용 이메일을 받아요.",
      },
      {
        bucket: "C",
        text: "플랫폼 owner가 원장 임시 비밀번호를 발급할 수 있어요.",
      },
    ],
  },
  {
    version: "2026.07.18-plans",
    date: "2026년 7월 18일",
    title: "Basic · Pro · Premium 요금제",
    summary: "학원별 요금제와 OCR 사용 범위를 명확하게 나눴어요.",
    changes: [
      {
        bucket: "A",
        text: "Basic은 오답 등록과 복습을 무제한으로 이용할 수 있어요.",
      },
      {
        bucket: "A",
        text: "Pro는 학생당 하루 OCR 10문제, Premium은 20문제를 지원해요.",
      },
      {
        bucket: "C",
        text: "원장은 결제 화면에서 현재 요금제와 예상 월 요금을 볼 수 있어요.",
      },
      {
        bucket: "C",
        text: "학원 코드는 영문과 숫자 4~12자로 만들 수 있어요.",
      },
    ],
  },
  {
    version: "2026.07.17",
    date: "2026년 7월 17일",
    title: "학원 초대와 결제 준비",
    summary: "여러 학원을 한곳에서 운영할 수 있는 기반을 추가했어요.",
    changes: [
      {
        bucket: "C",
        text: "초대 링크로 학원과 원장 계정을 만들 수 있어요.",
      },
      {
        bucket: "C",
        text: "학원별 학생 수와 예상 이용 요금을 확인할 수 있어요.",
      },
      {
        bucket: "A",
        text: "문제 사진을 AI로 읽어 등록을 돕는 기능을 준비했어요.",
      },
    ],
  },
];
