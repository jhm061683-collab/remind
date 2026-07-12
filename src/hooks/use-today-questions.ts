"use client";

import { useMemo } from "react";
import type { Question } from "@/types/question";

/** 오늘 복습할 문제 목록 (현재는 빈 배열, DB 연결 후 구현) */
export function useTodayQuestions(_subjectId?: string) {
  const questions = useMemo<Question[]>(() => [], []);

  return {
    questions,
    count: questions.length,
    isLoading: false,
  };
}
