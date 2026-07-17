"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  assignStudentsToClassAction,
  createClassRoomAction,
  deleteClassRoomAction,
  removeStudentFromClassAction,
  updateClassTeachersAction,
} from "@/lib/actions/admin";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ClassManagementData } from "@/lib/types/admin";

type Props = {
  data: ClassManagementData;
};

const SCHOOL_LEVELS = [
  { value: "elementary", label: "초등" },
  { value: "middle", label: "중등" },
  { value: "high", label: "고등" },
  { value: "adult", label: "성인" },
] as const;

export function ClassManagementBoard({ data }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newSchoolLevel, setNewSchoolLevel] =
    useState<(typeof SCHOOL_LEVELS)[number]["value"]>("middle");
  const [newGradeNumber, setNewGradeNumber] = useState(1);
  const [newTeacherIds, setNewTeacherIds] = useState<string[]>([]);

  const [addStudentIds, setAddStudentIds] = useState<Record<string, string[]>>({});

  const studentMap = useMemo(
    () => new Map(data.students.map((s) => [s.id, s])),
    [data.students],
  );

  const gradeOptions = useMemo(() => {
    const labels = new Set(
      data.classes.map((c) => c.gradeLabel).filter((l): l is string => Boolean(l)),
    );
    return Array.from(labels).sort((a, b) => a.localeCompare(b, "ko"));
  }, [data.classes]);

  const filteredClasses = useMemo(() => {
    if (gradeFilter === "all") return data.classes;
    return data.classes.filter((c) => c.gradeLabel === gradeFilter);
  }, [data.classes, gradeFilter]);

  function toggleTeacher(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((v) => v !== id) : [...list, id];
  }

  return (
    <div className="space-y-6">
      {message ? (
        <p className="rounded-xl bg-blue-50 px-4 py-2 text-sm text-blue-800">{message}</p>
      ) : null}

      <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-violet-50/50 p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">새 반 만들기</h2>
        <p className="mt-1 text-xs text-slate-600">
          학년과 반 이름(예: A반, 진학반)을 정하고 담당 선생님을 지정하세요.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={newSchoolLevel}
            onChange={(e) =>
              setNewSchoolLevel(e.target.value as typeof newSchoolLevel)
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {SCHOOL_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={12}
            value={newGradeNumber}
            onChange={(e) => setNewGradeNumber(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder="학년"
          />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="반 이름 (예: A반)"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={pending || !newName.trim()}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            onClick={() => {
              startTransition(async () => {
                const res = await createClassRoomAction({
                  name: newName,
                  schoolLevel: newSchoolLevel,
                  gradeNumber: newGradeNumber,
                  teacherIds: newTeacherIds,
                });
                setMessage(res.error ?? res.success ?? null);
                if (res.success) {
                  setNewName("");
                  setNewTeacherIds([]);
                }
              });
            }}
          >
            반 만들기
          </button>
        </div>
        {data.teachers.length > 0 ? (
          <div className="mt-3">
            <p className="mb-1 text-xs font-semibold text-slate-600">담당 선생님</p>
            <div className="flex flex-wrap gap-2">
              {data.teachers.map((teacher) => (
                <label
                  key={teacher.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={newTeacherIds.includes(teacher.id)}
                    onChange={() =>
                      setNewTeacherIds((prev) => toggleTeacher(prev, teacher.id))
                    }
                  />
                  {teacher.displayName}
                </label>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-amber-700">
            서브관리자를 먼저 등록하면 반 담당으로 지정할 수 있어요.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">
            반 목록 ({filteredClasses.length})
          </h2>
          {gradeOptions.length > 0 ? (
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm"
            >
              <option value="all">전체 학년</option>
              {gradeOptions.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        {filteredClasses.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
            아직 만든 반이 없어요. 위에서 학년별 반을 만들어 보세요.
          </p>
        ) : (
          filteredClasses.map((room) => {
            const expanded = expandedId === room.id;
            const selectedToAdd = addStudentIds[room.id] ?? [];
            const assignedStudents = room.studentIds
              .map((id) => studentMap.get(id))
              .filter((s): s is NonNullable<typeof s> => Boolean(s));

            return (
              <article
                key={room.id}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left"
                  onClick={() => setExpandedId(expanded ? null : room.id)}
                >
                  <div>
                    <p className="font-semibold text-slate-900">{room.displayLabel}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      담당: {room.teacherNames.join(", ") || "미지정"} · 학생{" "}
                      {room.studentIds.length}명
                    </p>
                  </div>
                  <span className="text-xs text-blue-600">{expanded ? "접기" : "펼치기"}</span>
                </button>

                {expanded ? (
                  <div className="border-t border-slate-100 px-4 py-4">
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-semibold text-slate-600">
                        담당 선생님 (복수 가능)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {data.teachers.map((teacher) => (
                          <label
                            key={teacher.id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={room.teacherIds.includes(teacher.id)}
                              disabled={pending}
                              onChange={() => {
                                const next = toggleTeacher(room.teacherIds, teacher.id);
                                startTransition(async () => {
                                  const res = await updateClassTeachersAction(room.id, next);
                                  setMessage(res.error ?? res.success ?? null);
                                });
                              }}
                            />
                            {teacher.displayName}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="mb-2 text-xs font-semibold text-slate-600">반 학생</p>
                      {assignedStudents.length === 0 ? (
                        <p className="text-xs text-slate-400">아직 배정된 학생이 없어요.</p>
                      ) : (
                        <ul className="space-y-1">
                          {assignedStudents.map((student) => (
                            <li
                              key={student.id}
                              className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                            >
                              <span>
                                {student.displayName}{" "}
                                <span className="text-xs text-slate-400">
                                  ({student.username})
                                </span>
                              </span>
                              <button
                                type="button"
                                disabled={pending}
                                className="text-xs text-red-600"
                                onClick={() => {
                                  startTransition(async () => {
                                    const res = await removeStudentFromClassAction(
                                      room.id,
                                      student.id,
                                    );
                                    setMessage(res.error ?? res.success ?? null);
                                  });
                                }}
                              >
                                제외
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="mb-4">
                      <p className="mb-2 text-xs font-semibold text-slate-600">
                        학생 추가 (다른 반에 있어도 추가 가능)
                      </p>
                      <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-2">
                        {data.students.map((student) => (
                          <label
                            key={student.id}
                            className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={selectedToAdd.includes(student.id)}
                              onChange={(e) => {
                                setAddStudentIds((prev) => {
                                  const current = prev[room.id] ?? [];
                                  const next = e.target.checked
                                    ? [...current, student.id]
                                    : current.filter((id) => id !== student.id);
                                  return { ...prev, [room.id]: next };
                                });
                              }}
                            />
                            <span>
                              {student.displayName}
                              {student.gradeLabel ? (
                                <span className="ml-1 text-xs text-slate-400">
                                  {student.gradeLabel}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        ))}
                      </div>
                      <button
                        type="button"
                        disabled={pending || selectedToAdd.length === 0}
                        className="mt-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        onClick={() => {
                          startTransition(async () => {
                            const res = await assignStudentsToClassAction(
                              room.id,
                              selectedToAdd,
                            );
                            setMessage(res.error ?? res.success ?? null);
                            if (res.success) {
                              setAddStudentIds((prev) => ({ ...prev, [room.id]: [] }));
                            }
                          });
                        }}
                      >
                        선택 학생 반에 추가
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={pending}
                      className="text-xs text-red-600"
                      onClick={() => setDeleteTarget(room.id)}
                    >
                      이 반 삭제
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </section>

      <p className="text-xs text-slate-500">
        학생별 상세 정보는{" "}
        <Link href="/admin/students" className="text-blue-600 underline">
          학생 관리
        </Link>
        에서 확인할 수 있어요.
      </p>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="이 반을 삭제할까요?"
        description="반 배정 정보만 삭제되고 학생 계정은 유지됩니다."
        confirmLabel="반 삭제"
        cancelLabel="취소"
        variant="danger"
        loading={pending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          startTransition(async () => {
            const res = await deleteClassRoomAction(deleteTarget);
            setMessage(res.error ?? res.success ?? null);
            setDeleteTarget(null);
            if (expandedId === deleteTarget) setExpandedId(null);
          });
        }}
      />
    </div>
  );
}
