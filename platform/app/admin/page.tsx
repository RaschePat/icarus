"use client";

import { useEffect, useState } from "react";
import { getCourses } from "@/lib/api";
import type { Course } from "@/lib/types";

export default function AdminPage() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    getCourses().then(setCourses).catch(() => {});
  }, []);

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold">운영 현황</h1>
        <p className="text-slate-400 text-sm mt-0.5">ICARUS 플랫폼 전체 현황을 확인하세요.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "등록 과정", value: `${courses.length}개`, color: "text-blue-300" },
          { label: "총 단원",   value: "—",                    color: "text-slate-100" },
          { label: "수강생",    value: "—",                    color: "text-emerald-300" },
          { label: "RED FLAG", value: "—",                    color: "text-red-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="font-semibold text-sm mb-4">등록된 과정</h2>
        {courses.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">등록된 과정이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {courses.map((c) => (
              <div key={c.id} className="bg-slate-800/40 border border-slate-700 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{c.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{c.description || "설명 없음"}</p>
                  </div>
                  <span className="badge bg-slate-700 text-slate-300 text-xs">{c.duration_months}개월</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
