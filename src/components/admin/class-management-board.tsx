"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  assignStudentsToClassAction,
  createClassRoomAction,
  deleteClassRoomAction,
  removeStudentFromClassAction,
  transferStudentClassAction,
  updateClassTeachersAction,
} from "@/lib/actions/admin";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ClassManagementData, ClassStudentBrief } from "@/lib/types/admin";

type Props = {
  data: ClassManagementData;
};

type ViewMode = "by_class" | "by_teacher";

const SCHOOL_LEVELS = [
  { value: "elementary", label: "초등" },
  { value: "middle", label: "중등" },
  { value: "high", label: "고등" },
  { value: "adult", label: "성인" },
] as const;

export function ClassManagementBoard({ data }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("by_class");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newSchoolLevel, setNewSchoolLevel] =
    useState<(typeof SCHOOL_LEVELS)[number]["value"]>("middle");
  const [newGradeNumber, setNewGradeNumber] = useState(1);
  const [newTeacherIds, setNewTeacherIds] = useState<string[]>([]);

  const [addStudentIds, setAddStudentIds] = useState<Record<string, string[]>>({});
  const [addSearch, setAddSearch] = useState<Record<string, string>>({});
  const [addGradeFilter, setAddGradeFilter] = useState<Record<string, string>>({});
  const [addUnassignedOnly, setAddUnassignedOnly] = useState<Record<string, boolean>>(
    {},
  );

  const [transferQuery, setTransferQuery] = useState("");
  const [transferStudentId, setTransferStudentId] = useState("");
  const [transferFromId, setTransferFromId] = useState("");
  const [transferToId, setTransferToId] = useState("");
  const [transferMode, setTransferMode] = useState<"move" | "add">("move");

  const unassignedCount = useMemo(
    () => data.students.filter((s) => s.classIds.length === 0).length,
    [data.students],
  );

  const studentGradeOptions = useMemo(() => {
    const labels = new Set(
      data.students.map((s) => s.gradeLabel).filter((l): l is string => Boolean(l)),
    );
    return Array.from(labels).sort((a, b) => a.localeCompare(b, "ko"));
  }, [data.students]);

  const classGradeOptions = useMemo(() => {
    const labels = new Set(
      data.classes.map((c) => c.gradeLabel).filter((l): l is string => Boolean(l)),
    );
    return Array.from(labels).sort((a, b) => a.localeCompare(b, "ko"));
  }, [data.classes]);

  const filteredClasses = useMemo(() => {
    if (gradeFilter === "all") return data.classes;
    return data.classes.filter((c) => c.gradeLabel === gradeFilter);
  }, [data.classes, gradeFilter]);

  const classesByGrade = useMemo(() => {
    const map = new Map<string, typeof filteredClasses>();
    for (const room of filteredClasses) {
      const key = room.gradeLabel ?? "학년 미지정";
      const arr = map.get(key) ?? [];
      arr.push(room);
      map.set(key, arr);
    }
    const keys = Array.from(map.keys()).sort((a, b) => {
      if (a === "학년 미지정") return 1;
      if (b === "학년 미지정") return -1;
      return a.localeCompare(b, "ko");
    });
    return keys.map((key) => ({
      gradeLabel: key,
      rooms: map.get(key) ?? [],
    }));
  }, [filteredClasses]);

  const transferMatches = useMemo(() => {
    const q = transferQuery.trim().toLowerCase();
    if (!q) return [] as ClassStudentBrief[];
    return data.students
      .filter(
        (s) =>
          s.displayName.toLowerCase().includes(q) ||
          s.username.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [data.students, transferQuery]);

  const selectedTransferStudent = useMemo(
    () => data.students.find((s) => s.id === transferStudentId) ?? null,
    [data.students, transferStudentId],
  );

  function toggleTeacher(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((v) => v !== id) : [...list, id];
  }

  function candidatesForRoom(roomId: string, roomGradeLabel: string | null) {
    const search = (addSearch[roomId] ?? "").trim().toLowerCase();
    const grade =
      addGradeFilter[roomId] ??
      (roomGradeLabel && studentGradeOptions.includes(roomGradeLabel)
        ? roomGradeLabel
        : "all");
    const unassignedOnly = addUnassignedOnly[roomId] ?? true;
    const room = data.classes.find((c) => c.id === roomId);
    const alreadyIn = new Set(room?.studentIds ?? []);

    return data.students
      .filter((student) => {
        if (alreadyIn.has(student.id)) return false;
        if (unassignedOnly && student.classIds.length > 0) return false;
        if (grade !== "all" && student.gradeLabel !== grade) return false;
        if (!search) return true;
        return (
          student.displayName.toLowerCase().includes(search) ||
          student.username.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => {
        const target = roomGradeLabel;
        const aSame = target && a.gradeLabel === target ? 0 : 1;
        const bSame = target && b.gradeLabel === target ? 0 : 1;
        if (aSame !== bSame) return aSame - bSame;
        const aUn = a.classIds.length === 0 ? 0 : 1;
        const bUn = b.classIds.length === 0 ? 0 : 1;
        if (aUn !== bUn) return aUn - bUn;
        return a.displayName.localeCompare(b.displayName, "ko");
      });
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-xl bg-blue-50 px-4 py-2 text-sm text-blue-800">{message}</p>
      ) : null}

      {unassignedCount > 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950">
          아직 반에 안 들어간 학생 <strong>{unassignedCount}명</strong>이 있어요.
          반을 펼친 뒤 「미배정만」으로 골라 넣을 수 있습니다.
        </p>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">학생 검색 · 반 이동</h2>
        <p className="mt-1 text-xs text-slate-500">
          이름/아이디로 찾아 다른 반으로 옮기거나, 반을 추가로 넣을 수 있어요.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <input
              value={transferQuery}
              onChange={(e) => {
                setTransferQuery(e.target.value);
                setTransferStudentId("");
              }}
              placeholder="학생 이름 또는 아이디 검색"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            {transferQuery.trim() && !transferStudentId ? (
              <ul className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-100">
                {transferMatches.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-slate-400">검색 결과 없음</li>
                ) : (
                  transferMatches.map((student) => (
                    <li key={student.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => {
                          setTransferStudentId(student.id);
                          setTransferFromId(student.classIds[0] ?? "");
                          setTransferQuery(student.displayName);
                        }}
                      >
                        <span>
                          {student.displayName}{" "}
                          <span className="text-xs text-slate-400">
                            ({student.username})
                          </span>
                        </span>
                        <span className="text-xs text-slate-400">
                          {student.classLabels.join(", ") || "미배정"}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>

          <div className="space-y-2">
            {selectedTransferStudent ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                선택: <strong>{selectedTransferStudent.displayName}</strong> · 현재{" "}
                {selectedTransferStudent.classLabels.join(", ") || "미배정"}
              </p>
            ) : (
              <p className="text-xs text-slate-400">위에서 학생을 선택하세요.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-1.5 text-xs">
                <input
                  type="radio"
                  checked={transferMode === "move"}
                  onChange={() => setTransferMode("move")}
                />
                반 이동 (기존 반에서 뺌)
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs">
                <input
                  type="radio"
                  checked={transferMode === "add"}
                  onChange={() => setTransferMode("add")}
                />
                반 추가 (여러 반 유지)
              </label>
            </div>
            {transferMode === "move" &&
            selectedTransferStudent &&
            selectedTransferStudent.classIds.length > 1 ? (
              <select
                value={transferFromId}
                onChange={(e) => setTransferFromId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">모든 기존 반에서 빼고 이동</option>
                {selectedTransferStudent.classIds.map((id, idx) => (
                  <option key={id} value={id}>
                    {selectedTransferStudent.classLabels[idx]} 에서만 빼고 이동
                  </option>
                ))}
              </select>
            ) : null}
            <select
              value={transferToId}
              onChange={(e) => setTransferToId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">옮길 반 선택</option>
              {data.classes.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.displayLabel}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={pending || !transferStudentId || !transferToId}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => {
                startTransition(async () => {
                  const res = await transferStudentClassAction({
                    studentId: transferStudentId,
                    toClassRoomId: transferToId,
                    fromClassRoomId: transferFromId || null,
                    mode: transferMode,
                  });
                  setMessage(res.error ?? res.success ?? null);
                  if (res.success) {
                    setTransferStudentId("");
                    setTransferQuery("");
                    setTransferFromId("");
                    setTransferToId("");
                  }
                });
              }}
            >
              {transferMode === "move" ? "반 이동 실행" : "반 추가 실행"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-violet-50/50 p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">새 반 만들기</h2>
        <p className="mt-1 text-xs text-slate-600">
          학년 + 반 이름으로 만들고, 담당 선생님(원장 포함)을 지정하세요. 학생은
          반에 넣으면 담당 선생님에게 자동으로 보입니다.
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
            원장 또는 서브관리자를 등록하면 반 담당으로 지정할 수 있어요.
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView("by_class")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              view === "by_class"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            반별 보기
          </button>
          <button
            type="button"
            onClick={() => setView("by_teacher")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              view === "by_teacher"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            선생님별 보기
          </button>
        </div>
        {view === "by_class" && classGradeOptions.length > 0 ? (
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm"
          >
            <option value="all">전체 학년</option>
            {classGradeOptions.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {view === "by_class" ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            반 목록 ({filteredClasses.length})
          </h2>
          {filteredClasses.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
              아직 만든 반이 없어요. 위에서 학년별 반을 만들어 보세요.
            </p>
          ) : (
            classesByGrade.map((group) => (
              <div key={group.gradeLabel} className="space-y-2">
                <h3 className="sticky top-[3.25rem] z-10 rounded-lg bg-slate-100/95 px-3 py-2 text-sm font-bold text-slate-800 backdrop-blur">
                  {group.gradeLabel}{" "}
                  <span className="font-medium text-slate-500">
                    · {group.rooms.length}개 반 ·{" "}
                    {group.rooms.reduce((sum, r) => sum + r.studentCount, 0)}명
                  </span>
                </h3>
                {group.rooms.map((room) => {
              const expanded = expandedId === room.id;
              const selectedToAdd = addStudentIds[room.id] ?? [];
              const gradeSel =
                addGradeFilter[room.id] ??
                (room.gradeLabel && studentGradeOptions.includes(room.gradeLabel)
                  ? room.gradeLabel
                  : "all");
              const unassignedOnly = addUnassignedOnly[room.id] ?? true;
              const candidates = candidatesForRoom(room.id, room.gradeLabel);

              return (
                <article
                  key={room.id}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left"
                    onClick={() => {
                      setExpandedId(expanded ? null : room.id);
                      if (!expanded && room.gradeLabel) {
                        setAddGradeFilter((prev) => ({
                          ...prev,
                          [room.id]:
                            prev[room.id] ??
                            (studentGradeOptions.includes(room.gradeLabel!)
                              ? room.gradeLabel!
                              : "all"),
                        }));
                      }
                    }}
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {room.displayLabel}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        담당: {room.teacherNames.join(", ") || "미지정"} · 인원{" "}
                        {room.studentCount}명
                      </p>
                      {room.students.length > 0 ? (
                        <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                          {room.students.map((s) => s.displayName).join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <span className="text-xs text-blue-600">
                      {expanded ? "접기" : "명단·배정"}
                    </span>
                  </button>

                  {expanded ? (
                    <div className="space-y-3 border-t border-slate-100 px-3 py-3">
                      <div>
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
                                  const next = toggleTeacher(
                                    room.teacherIds,
                                    teacher.id,
                                  );
                                  startTransition(async () => {
                                    const res = await updateClassTeachersAction(
                                      room.id,
                                      next,
                                    );
                                    setMessage(res.error ?? res.success ?? null);
                                  });
                                }}
                              />
                              {teacher.displayName}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-semibold text-slate-600">
                          학생 명단 ({room.studentCount}명)
                        </p>
                        {room.students.length === 0 ? (
                          <p className="text-xs text-slate-400">
                            아직 배정된 학생이 없어요.
                          </p>
                        ) : (
                          <ul className="grid gap-1 sm:grid-cols-2">
                            {room.students.map((student) => (
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

                      <div>
                        <p className="mb-2 text-xs font-semibold text-slate-600">
                          학생 반에 넣기
                        </p>
                        <div className="mb-2 flex flex-wrap gap-2">
                          <select
                            value={gradeSel}
                            onChange={(e) =>
                              setAddGradeFilter((prev) => ({
                                ...prev,
                                [room.id]: e.target.value,
                              }))
                            }
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm"
                          >
                            <option value="all">전체 학년</option>
                            {studentGradeOptions.map((label) => (
                              <option key={label} value={label}>
                                {label}
                              </option>
                            ))}
                          </select>
                          <label className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs">
                            <input
                              type="checkbox"
                              checked={unassignedOnly}
                              onChange={(e) =>
                                setAddUnassignedOnly((prev) => ({
                                  ...prev,
                                  [room.id]: e.target.checked,
                                }))
                              }
                            />
                            미배정만
                          </label>
                          <input
                            value={addSearch[room.id] ?? ""}
                            onChange={(e) =>
                              setAddSearch((prev) => ({
                                ...prev,
                                [room.id]: e.target.value,
                              }))
                            }
                            placeholder="이름/아이디 검색"
                            className="min-w-[10rem] flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm"
                          />
                        </div>
                        <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-2">
                          {candidates.length === 0 ? (
                            <p className="px-2 py-2 text-xs text-slate-400">
                              조건에 맞는 학생이 없어요.
                            </p>
                          ) : (
                            candidates.map((student) => (
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
                                <span className="flex-1">
                                  {student.displayName}
                                  {student.gradeLabel ? (
                                    <span className="ml-1 text-xs text-slate-400">
                                      {student.gradeLabel}
                                    </span>
                                  ) : null}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {student.classLabels.join(", ") || "미배정"}
                                </span>
                              </label>
                            ))
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={pending || selectedToAdd.length === 0}
                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            onClick={() => {
                              startTransition(async () => {
                                const res = await assignStudentsToClassAction(
                                  room.id,
                                  selectedToAdd,
                                );
                                setMessage(res.error ?? res.success ?? null);
                                if (res.success) {
                                  setAddStudentIds((prev) => ({
                                    ...prev,
                                    [room.id]: [],
                                  }));
                                }
                              });
                            }}
                          >
                            선택 {selectedToAdd.length}명 반에 추가
                          </button>
                          <button
                            type="button"
                            disabled={pending || candidates.length === 0}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
                            onClick={() => {
                              setAddStudentIds((prev) => ({
                                ...prev,
                                [room.id]: candidates.map((s) => s.id),
                              }));
                            }}
                          >
                            목록 전체 선택 ({candidates.length})
                          </button>
                        </div>
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
                })}
              </div>
            ))
          )}
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            선생님별 담당 ({data.teacherOverviews.length})
          </h2>
          {data.teacherOverviews.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
              서브관리자가 아직 없어요.
            </p>
          ) : (
            data.teacherOverviews.map((teacher) => {
              const expanded = expandedTeacherId === teacher.id;
              return (
                <article
                  key={teacher.id}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left"
                    onClick={() =>
                      setExpandedTeacherId(expanded ? null : teacher.id)
                    }
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {teacher.displayName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        담당 반 {teacher.classLabels.length}개 · 학생{" "}
                        {teacher.studentCount}명
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {teacher.classLabels.join(", ") || "담당 반 없음"}
                      </p>
                    </div>
                    <span className="text-xs text-blue-600">
                      {expanded ? "접기" : "자세히"}
                    </span>
                  </button>
                  {expanded ? (
                    <div className="space-y-3 border-t border-slate-100 px-3 py-3">
                      <div>
                        <p className="mb-1 text-xs font-semibold text-slate-600">
                          담당 반
                        </p>
                        {teacher.classLabels.length === 0 ? (
                          <p className="text-xs text-slate-400">
                            아직 지정된 반이 없어요.
                          </p>
                        ) : (
                          <ul className="space-y-1 text-sm text-slate-700">
                            {teacher.classIds.map((classId, idx) => {
                              const room = data.classes.find((c) => c.id === classId);
                              return (
                                <li
                                  key={classId}
                                  className="rounded-lg bg-slate-50 px-3 py-2"
                                >
                                  {teacher.classLabels[idx]} ·{" "}
                                  {room?.studentCount ?? 0}명
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-semibold text-slate-600">
                          담당 학생 명단
                        </p>
                        {teacher.studentNames.length === 0 ? (
                          <p className="text-xs text-slate-400">학생이 없어요.</p>
                        ) : (
                          <p className="text-sm leading-relaxed text-slate-700">
                            {teacher.studentNames.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </section>
      )}

      <p className="text-xs text-slate-500">
        학생 계정 등록은{" "}
        <Link href="/admin/students" className="text-blue-600 underline">
          학생 관리
        </Link>
        에서 할 수 있어요.
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
