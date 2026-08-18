"use client";

import { StaffModeSwitch } from "@/components/layout/staff-mode-switch";
import { showsViewScopeSwitch } from "@/lib/auth/view-scope-routes";
import { usePathname } from "next/navigation";

type Props = {
  currentScope: import("@/lib/auth/staff-mode").StaffViewScope;
};

/** 학습 운영 화면에서만 학원 전체/내 담당 토글을 표시한다. */
export function StaffModeSwitchGate({ currentScope }: Props) {
  const pathname = usePathname();
  if (!showsViewScopeSwitch(pathname)) return null;
  return <StaffModeSwitch currentScope={currentScope} />;
}
