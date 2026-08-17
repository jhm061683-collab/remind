/** 화면에 보이는 한국어 문구 — 등록 / 다시 풀기 / 보관함 으로 통일 */
export const UI_LABELS = {
  todayQueue: "오늘 다시 풀 문제",
  todayQueueUnit: "문제",
  todayQueueEmpty: "오늘 다시 풀 문제가 없어요",
  todayQueueCta: "다시 풀기",
  todayQueueEmptyCta: "일정 보기",

  activeQuestions: "다시 푸는 중",
  archivedQuestions: "보관 완료",
  scheduledQuestions: "예정",

  studyTab: "다시 풀기",
  registerTab: "등록",
  /** 홈 큰 버튼 제목 — 탭 라벨(등록)과 동일 계열 */
  registerCtaTitle: "문제 등록",
  archiveTab: "보관함",

  studyCount: "다시 푼 횟수",
  studyCountRule: "「다시 풀기」에서 문제를 풀 때마다 1회 (맞힘·틀림 모두)",
  streakLabel: "연속 학습",
  streakRule: "하루에 1번 이상 다시 풀면 그날은 연속 기록에 포함",

  statusKeeping: "다시 푸는 중",
  statusArchived: "보관 완료",

  registerPhoto: "문제 사진",
  registerPhotoHint:
    "한 문제에 한 장이 가장 정확해요. 긴 지문만 여러 장으로 이어 올려 주세요.",

  studyPageTitle: "다시 풀기",
  studyPageDesc:
    "문제를 보고 내 답을 적은 뒤, 정답을 확인해 맞힘·틀림을 골라요.",

  archivePageTitle: "보관함",
  archivePageDesc:
    "다시 푸는 중·보관 완료한 문제를 찾아보세요. 끝난 문제는 「보관 완료」에 있어요.",

  archiveTabActive: "다시 푸는 중",
  archiveTabSaved: "보관 완료",

  weeklyReport: "이번 주",
  weekRegistered: "등록",
  weekStudied: "다시 풀기",
  weekArchived: "보관 완료",

  /** 통계용 — 메인 동사로 쓰지 말고 옆에 설명 */
  masteryStatLabel: "보관 비율",
  masteryStatHint: "전체 중 보관 완료한 비율",
  activeStatLabel: "다시 푸는 중",
  studyScoreHint: "이번 달 다시 풀기·출석으로 쌓이는 점수예요",
} as const;
