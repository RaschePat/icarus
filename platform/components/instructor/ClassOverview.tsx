"use client";

import { useEffect, useState } from "react";
import type { StudentStatus } from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/v1";

const HINT_LABEL: Record<0 | 1 | 2 | 3, { text: string; cls: string }> = {
  0: { text: "정상",       cls: "bg-slate-700 text-slate-300" },
  1: { text: "힌트 1단계", cls: "bg-yellow-800/50 text-yellow-300" },
  2: { text: "힌트 2단계", cls: "bg-orange-800/50 text-orange-300" },
  3: { text: "힌트 3단계", cls: "bg-red-800/50 text-red-300" },
};

function ProgressBar({ value }: { value: number }) {
  const color =
    value >= 70 ? "bg-emerald-500" : value >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="w-full bg-slate-700 rounded-full h-2">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

async function fetchStudentStatuses(): Promise<StudentStatus[]> {
  try {
    const res = await fetch(`${BASE}/activity/class-status`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

interface Props {
  /** 초기 데이터 (데모/SSR용). 없으면 API에서 가져옴 */
  initialStudents?: StudentStatus[];
  /** 폴링 간격 ms. 0이면 폴링 안 함 */
  pollInterval?: number;
}

export default function ClassOverview({ initialStudents = [], pollInterval = 15_000 }: Props) {
  const [students, setStudents] = useState<StudentStatus[]>(initialStudents);

  useEffect(() => {
    if (pollInterval <= 0) return;
    const load = () => fetchStudentStatuses().then((data) => { if (data.length > 0) setStudents(data); });
    load();
    const id = setInterval(load, pollInterval);
    return () => clearInterval(id);
  }, [pollInterval]);

  const redFlags = students.filter((s) => s.is_red_flag);
  const avgProgress =
    students.length > 0
      ? Math.round(students.reduce((a, s) => a + s.progress, 0) / students.length)
      : 0;

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">📊 학급 이해도 현황 (실시간)</h2>
        <div className="flex gap-3 text-xs text-slate-400">
          <span>전체 {students.length}명</span>
          {redFlags.length > 0 && (
            <span className="text-red-400 font-semibold">🚨 RED FLAG {redFlags.length}명</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "평균 진도율", value: `${avgProgress}%`, color: "text-blue-300" },
          { label: "완료",        value: `${students.filter((s) => s.progress >= 100).length}명`, color: "text-emerald-300" },
          { label: "이탈 위험",   value: `${redFlags.length}명`, color: redFlags.length > 0 ? "text-red-400" : "text-slate-300" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-800 rounded-lg p-3 text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 border-b border-slate-700">
              <th className="text-left pb-2 font-medium">이름</th>
              <th className="text-left pb-2 font-medium">진도율</th>
              <th className="text-left pb-2 font-medium">힌트 단계</th>
              <th className="text-left pb-2 font-medium">마지막 활동</th>
              <th className="text-left pb-2 font-medium">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {students.map((s) => (
              <tr key={s.user_id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    {s.is_red_flag && <span title="이탈 위험">🚨</span>}
                    <span className={s.is_red_flag ? "text-red-300" : ""}>{s.name}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-4 min-w-[120px]">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={s.progress} />
                    <span className="text-xs text-slate-400 w-9 shrink-0">{s.progress}%</span>
                  </div>
                </td>
                <td className="py-2.5 pr-4">
                  <span className={`badge ${HINT_LABEL[s.hint_level].cls}`}>
                    {HINT_LABEL[s.hint_level].text}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-xs text-slate-400 font-mono">{s.last_active}</td>
                <td className="py-2.5">
                  {s.is_red_flag ? (
                    <span className="badge bg-red-900/40 text-red-300">위험</span>
                  ) : (
                    <span className="badge bg-emerald-900/30 text-emerald-400">정상</span>
                  )}
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500 text-sm">
                  수강생 데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
