"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { GuidedTour } from "@/components/tutorial/guided-tour";
import { hideTutorialAction } from "@/lib/actions/tutorial";
import {
  findMatchingTutorials,
  tutorialByKey,
  tutorialsForRole,
} from "@/lib/tutorial/catalog";
import {
  mergeHiddenPreference,
  shouldAutoShow,
} from "@/lib/tutorial/preferences";
import type {
  TourRole,
  TourRunMode,
  TutorialDefinition,
  TutorialPreference,
} from "@/lib/tutorial/types";

type TutorialContextValue = {
  prefs: TutorialPreference[];
  role: TourRole | null;
  available: TutorialDefinition[];
  replay: (key: string) => void;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);

type Pending = { key: string; mode: TourRunMode };

type Props = {
  userId: string;
  role: TourRole | null;
  initialPrefs: TutorialPreference[];
  children: React.ReactNode;
};

export function TutorialProvider({
  userId,
  role,
  initialPrefs,
  children,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [prefs, setPrefs] = useState(initialPrefs);
  const [run, setRun] = useState<{
    def: TutorialDefinition;
    mode: TourRunMode;
  } | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const closedAutoKeys = useRef(new Set<string>());

  const available = useMemo(
    () => (role ? tutorialsForRole(role) : []),
    [role],
  );

  const startOnPath = useCallback(
    (key: string, mode: TourRunMode, path: string) => {
      const def = tutorialByKey(key);
      if (!def || (role && def.role !== role)) return;
      if (def.matchPath(path)) {
        pendingRef.current = null;
        setRun({ def, mode });
        return;
      }
      pendingRef.current = { key, mode };
      if (path !== def.startPath) {
        router.push(def.startPath);
      }
    },
    [role, router],
  );

  const replay = useCallback(
    (key: string) => {
      startOnPath(key, "manual", pathname);
    },
    [pathname, startOnPath],
  );

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending || run) return;
    const def = tutorialByKey(pending.key);
    if (def?.matchPath(pathname)) {
      pendingRef.current = null;
      setRun({ def, mode: pending.mode });
    }
  }, [pathname, run]);

  useEffect(() => {
    if (run || pendingRef.current || !role) return;
    const matches = findMatchingTutorials(role, pathname);
    const next = matches.find(
      (tutorial) =>
        shouldAutoShow(tutorial, prefs) &&
        !closedAutoKeys.current.has(tutorial.key),
    );
    if (next) {
      void Promise.resolve().then(() => setRun({ def: next, mode: "auto" }));
    }
  }, [pathname, prefs, role, run]);

  useEffect(() => {
    if (!run) return;
    if (!run.def.matchPath(pathname)) {
      if (run.mode === "auto") closedAutoKeys.current.add(run.def.key);
      void Promise.resolve().then(() => setRun(null));
    }
  }, [pathname, run]);

  const handleDismiss = useCallback(
    (opts: { hide: boolean }) => {
      if (!run) return;
      if (run.mode === "auto") closedAutoKeys.current.add(run.def.key);
      if (opts.hide) {
        setPrefs((prev) => mergeHiddenPreference(prev, run.def));
        void hideTutorialAction({
          tutorialKey: run.def.key,
          tutorialVersion: run.def.version,
        });
      }
      setRun(null);
    },
    [run],
  );

  const value = useMemo(
    () => ({ prefs, role, available, replay }),
    [available, prefs, replay, role],
  );

  if (userId === "guest") {
    return <>{children}</>;
  }

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {run ? (
        <GuidedTour
          tutorial={run.def}
          mode={run.mode}
          onDismiss={handleDismiss}
        />
      ) : null}
    </TutorialContext.Provider>
  );
}

export function useTutorial(): TutorialContextValue {
  const ctx = useContext(TutorialContext);
  if (!ctx) {
    return {
      prefs: [],
      role: null,
      available: [],
      replay: () => {},
    };
  }
  return ctx;
}
