import type { SubAdminRow } from "@/lib/types/admin";

type Props = {
  subAdmins: SubAdminRow[];
};

export function SubAdminsList({ subAdmins }: Props) {
  if (subAdmins.length === 0) {
    return (
      <p className="rounded-2xl border border-zinc-200 bg-white px-5 py-10 text-center text-sm text-zinc-500 shadow-sm">
        등록된 서브관리자가 없습니다. 위에서 계정을 추가해 주세요.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-4 py-3 font-medium">이름</th>
            <th className="px-4 py-3 font-medium">아이디</th>
            <th className="px-4 py-3 font-medium">권한</th>
            <th className="px-4 py-3 font-medium">담당 학생</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {subAdmins.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 font-medium text-zinc-900">
                {row.displayName}
              </td>
              <td className="px-4 py-3 text-zinc-600">{row.username}</td>
              <td className="px-4 py-3 text-zinc-700">
                {row.isDirector ? (
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                    원장
                  </span>
                ) : (
                  <span className="text-xs text-zinc-400">선생님</span>
                )}
              </td>
              <td className="px-4 py-3 text-zinc-800">{row.assignedCount}명</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
