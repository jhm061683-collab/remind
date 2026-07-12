"use client";

import { useEffect, useState } from "react";
import { getTodayReviewQuestions } from "@/lib/data/questions";

type Props = {
  userId: string;
};

export function TodayReviewCount({ userId }: Props) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    void getTodayReviewQuestions(userId)
      .then((items) => setCount(items.length))
      .catch(() => setCount(0));
  }, [userId]);

  if (count === null) {
    return (
      <p className="mt-2 text-4xl font-bold tracking-tight text-white/60 md:text-5xl">
        …
      </p>
    );
  }

  return (
    <p className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
      {count}
      <span className="ml-1 text-2xl font-semibold text-blue-100 md:text-3xl">
        문제
      </span>
    </p>
  );
}
