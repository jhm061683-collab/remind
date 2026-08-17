export type TourRole = "student" | "admin" | "sub_admin";

export type TourStep = {
  id: string;
  /** [data-tour-id] 값. DOM 위치 선택자 금지 */
  target: string;
  title: string;
  description: string;
  allowInteraction?: boolean;
};

export type TutorialDefinition = {
  key: string;
  version: number;
  title: string;
  role: TourRole;
  startPath: string;
  matchPath: (pathname: string) => boolean;
  steps: TourStep[];
};

export type TutorialPreference = {
  tutorialKey: string;
  tutorialVersion: number;
  autoHidden: boolean;
};

export type TourRunMode = "auto" | "manual";
