import type { TutorialDefinition, TutorialPreference } from "@/lib/tutorial/types";

/** 해당 버전을 계정에서 자동 숨김했는지 */
export function isAutoHidden(
  tutorial: Pick<TutorialDefinition, "key" | "version">,
  prefs: TutorialPreference[],
): boolean {
  return prefs.some(
    (pref) =>
      pref.tutorialKey === tutorial.key &&
      pref.tutorialVersion === tutorial.version &&
      pref.autoHidden,
  );
}

/** 자동 노출: 같은 key+version 이 숨김이 아니면 보여준다. v2 는 v1 숨김과 별개 */
export function shouldAutoShow(
  tutorial: Pick<TutorialDefinition, "key" | "version">,
  prefs: TutorialPreference[],
): boolean {
  return !isAutoHidden(tutorial, prefs);
}

/** 한 번 true 가 된 숨김은 false 로 되돌리지 않는다 */
export function mergeHiddenPreference(
  prefs: TutorialPreference[],
  next: Pick<TutorialDefinition, "key" | "version">,
): TutorialPreference[] {
  const others = prefs.filter(
    (pref) =>
      pref.tutorialKey !== next.key || pref.tutorialVersion !== next.version,
  );
  return [
    ...others,
    {
      tutorialKey: next.key,
      tutorialVersion: next.version,
      autoHidden: true,
    },
  ];
}

/** 수동 다시 보기는 서버 숨김 상태를 바꾸지 않는다 */
export function prefsAfterManualReplay(
  prefs: TutorialPreference[],
): TutorialPreference[] {
  return prefs.map((pref) => ({ ...pref, autoHidden: pref.autoHidden }));
}
