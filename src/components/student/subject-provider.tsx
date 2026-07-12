"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { loadUserSubjectsAction } from "@/lib/actions/user-meta";
import {
  DEFAULT_SUBJECTS,
  getUserSubjects,
  SUBJECTS_UPDATED,
  type UserSubject,
} from "@/lib/data/user-subjects";
import { isSupabaseEnabled } from "@/lib/supabase/config";

type SubjectContextValue = {
  subjects: UserSubject[];
  loading: boolean;
  getSubjectName: (id: string) => string;
  refresh: () => Promise<void>;
};

const SubjectContext = createContext<SubjectContextValue | null>(null);

export function SubjectProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [subjects, setSubjects] = useState<UserSubject[]>(DEFAULT_SUBJECTS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId || userId === "guest") {
      setSubjects(DEFAULT_SUBJECTS);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (isSupabaseEnabled()) {
        const loaded = await loadUserSubjectsAction();
        setSubjects(loaded ?? DEFAULT_SUBJECTS);
      } else {
        setSubjects(await getUserSubjects(userId));
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
    function onUpdated() {
      void refresh();
    }
    window.addEventListener(SUBJECTS_UPDATED, onUpdated);
    return () => window.removeEventListener(SUBJECTS_UPDATED, onUpdated);
  }, [refresh]);

  const value = useMemo<SubjectContextValue>(
    () => ({
      subjects,
      loading,
      getSubjectName: (id) =>
        subjects.find((s) => s.id === id)?.name ?? "삭제된 과목",
      refresh,
    }),
    [subjects, loading, refresh],
  );

  return (
    <SubjectContext.Provider value={value}>{children}</SubjectContext.Provider>
  );
}

export function useSubjects() {
  const ctx = useContext(SubjectContext);
  if (!ctx) {
    throw new Error("useSubjects must be used within SubjectProvider");
  }
  return ctx;
}
