"use client";

import { useActionState, useState } from "react";
import {
  createAcademyUserAction,
  createStudentsBulkAction,
  type CreateUserState,
} from "@/lib/actions/admin";
import type { UserRole } from "@/types/user";

const initialState: CreateUserState = {};

type Props = {
  role: Extract<UserRole, "student" | "sub_admin">;
  title: string;
  classOptions?: { id: string; displayLabel: string }[];
};

export function CreateUserForm({ role, title, classOptions = [] }: Props) {
  const [state, formAction, pending] = useActionState(
    createAcademyUserAction,
    initialState,
  );
  const [bulkState, bulkAction, bulkPending] = useActionState(
    createStudentsBulkAction,
    initialState,
  );
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-zinc-900">{title}</h2>
      <p className="mt-1 text-sm text-zinc-500">
        아이디는 이름으로 자동 생성되고, 초기 비밀번호는 휴대폰 뒤 4자리입니다.
      </p>

      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="role" value={role} />

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            이름
          </label>
          <input
            name="displayName"
            required
            placeholder="예: 김민수"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            휴대폰
          </label>
          <input
            name="phone"
            required
            autoComplete="tel"
            placeholder="01012345678"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-zinc-400">
            초기 비밀번호로 뒤 4자리를 사용합니다.
          </p>
        </div>

        {role === "student" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                학교급
              </label>
              <select
                name="schoolLevel"
                required
                defaultValue="middle"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="elementary">초등</option>
                <option value="middle">중등</option>
                <option value="high">고등</option>
                <option value="adult">성인</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                학년
              </label>
              <input
                name="gradeNumber"
                type="number"
                min={1}
                max={10}
                defaultValue={1}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
        ) : null}

        {role === "student" && classOptions.length > 0 ? (
          <div>
            <p className="mb-1 text-sm font-medium text-zinc-700">
              반 배정 (선택 · 여러 개 가능)
            </p>
            <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 p-2">
              {classOptions.map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-zinc-50"
                >
                  <input type="checkbox" name="classIds" value={opt.id} />
                  {opt.displayLabel}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              나중에 학생 목록·반 관리에서도 일괄 배정할 수 있어요.
            </p>
          </div>
        ) : null}

        {role === "student" && classOptions.length === 0 ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            아직 반이 없어요.{" "}
            <a href="/admin/classes" className="font-semibold underline">
              반 관리
            </a>
            에서 반을 만든 뒤, 등록 시 바로 배정하거나 나중에 일괄 배정하세요.
          </p>
        ) : null}

        {role === "sub_admin" ? (
          <label className="flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-950">
            <input
              type="checkbox"
              name="isDirector"
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold">원장으로 지정</span>
              <span className="mt-0.5 block text-xs text-violet-800/90">
                이 계정은 선생님 모드로 쓰고, 필요할 때 관리자 모드로 전환할 수
                있어요. (학원·반·계정 관리)
              </span>
            </span>
          </label>
        ) : null}

        {state.error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {state.success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "만드는 중…" : "+ 계정 만들기"}
        </button>
      </form>

      {role === "student" ? (
        <div className="mt-5 border-t border-zinc-200 pt-4">
          <h3 className="text-sm font-semibold text-zinc-900">
            학생 일괄등록 (.xlsx)
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            양식 컬럼: 이름 / 휴대폰 / 학교급 / 학년
          </p>

          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
            <p className="font-semibold">휴대폰 앞자리 0이 사라질 때</p>
            <p className="mt-1">
              엑셀이 번호를 숫자로 읽어{" "}
              <span className="font-mono">01012341234 → 1012341234</span> 처럼
              보일 수 있어요. 아래처럼 하면 됩니다.
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>휴대폰 칸을 「텍스트」 서식으로 바꾼 뒤 입력</li>
              <li>
                앞에 따옴표: <span className="font-mono">&apos;01012341234</span>
              </li>
              <li>
                또는 하이픈: <span className="font-mono">010-1234-1234</span>
              </li>
            </ul>
            <p className="mt-1 text-amber-800/90">
              앱에서도 0이 빠진 10자리 번호는 자동으로 앞에 0을 붙여 복구합니다.
            </p>
          </div>

          <a
            href="/api/admin/students-template"
            className="mt-3 inline-flex min-h-10 items-center rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-800 hover:bg-blue-100"
          >
            엑셀 양식 다운로드
          </a>

          <form action={bulkAction} className="mt-3 space-y-3">
            <label className="flex min-h-[5.5rem] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-5 text-center transition hover:border-blue-400 hover:bg-blue-100/80">
              <span className="text-base font-bold text-blue-900">
                📂 엑셀 파일 올리기
              </span>
              <span className="text-xs text-blue-800/80">
                {fileName ? fileName : "여기를 눌러 .xlsx 파일을 선택하세요"}
              </span>
              <input
                name="xlsx"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                required
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setFileName(file?.name ?? null);
                }}
              />
            </label>

            {bulkState.error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm whitespace-pre-line text-red-700">
                {bulkState.error}
              </p>
            ) : null}
            {bulkState.success ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {bulkState.success}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={bulkPending || !fileName}
              className="min-h-12 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {bulkPending ? "업로드 중…" : "일괄등록 실행"}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
