"use client";

import { useEffect, useState } from "react";
import { getCourses, createCourse, getUnits, createUnit } from "@/lib/api";
import type { Course, Unit } from "@/lib/types";

export default function InstructorCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // 과정 추가 폼
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [courseDuration, setCourseDuration] = useState(3);
  const [addingCourse, setAddingCourse] = useState(false);

  // 단원 추가 폼
  const [unitTitle, setUnitTitle] = useState("");
  const [unitOrder, setUnitOrder] = useState(0);
  const [addingUnit, setAddingUnit] = useState(false);

  const loadCourses = () =>
    getCourses()
      .then(setCourses)
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { loadCourses(); }, []);

  const loadUnits = (course: Course) => {
    setSelectedCourse(course);
    getUnits(course.id).then(setUnits).catch(() => {});
  };

  const handleAddCourse = async () => {
    if (!courseTitle.trim()) return;
    setAddingCourse(true);
    try {
      await createCourse({ title: courseTitle, description: courseDesc, duration_months: courseDuration });
      setCourseTitle(""); setCourseDesc(""); setCourseDuration(3);
      loadCourses();
    } finally {
      setAddingCourse(false);
    }
  };

  const handleAddUnit = async () => {
    if (!unitTitle.trim() || !selectedCourse) return;
    setAddingUnit(true);
    try {
      await createUnit(selectedCourse.id, { title: unitTitle, order_index: unitOrder });
      setUnitTitle(""); setUnitOrder(0);
      loadUnits(selectedCourse);
    } finally {
      setAddingUnit(false);
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold">과정 / 단원 관리</h1>
        <p className="text-slate-400 text-sm mt-0.5">과정을 만들고 단원을 구성하세요.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 과정 목록 */}
        <div className="card flex flex-col gap-4">
          <h2 className="font-semibold text-sm">과정 목록</h2>

          {/* 추가 폼 */}
          <div className="flex flex-col gap-2 border border-slate-700 rounded-lg p-3">
            <input className="input text-sm" placeholder="과정 제목" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} />
            <input className="input text-sm" placeholder="설명" value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)} />
            <div className="flex gap-2 items-center">
              <label className="text-xs text-slate-400 shrink-0">기간(월)</label>
              <input type="number" className="input text-sm w-20" min={1} value={courseDuration} onChange={(e) => setCourseDuration(Number(e.target.value))} />
              <button className="btn-primary text-sm px-3 ml-auto" onClick={handleAddCourse} disabled={addingCourse}>
                {addingCourse ? "추가 중…" : "추가"}
              </button>
            </div>
          </div>

          {loading && <p className="text-slate-500 text-sm animate-pulse">불러오는 중…</p>}
          <div className="flex flex-col gap-2">
            {courses.map((c) => (
              <button
                key={c.id}
                onClick={() => loadUnits(c)}
                className={`text-left rounded-lg px-4 py-3 transition-colors border ${
                  selectedCourse?.id === c.id
                    ? "bg-blue-900/30 border-blue-500/50 text-blue-200"
                    : "bg-slate-800/40 border-slate-700 hover:border-slate-600"
                }`}
              >
                <p className="font-semibold text-sm">{c.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{c.description || "설명 없음"} · {c.duration_months}개월</p>
              </button>
            ))}
            {!loading && courses.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">과정이 없습니다.</p>
            )}
          </div>
        </div>

        {/* 단원 목록 */}
        <div className="card flex flex-col gap-4">
          <h2 className="font-semibold text-sm">
            {selectedCourse ? `${selectedCourse.title} — 단원` : "과정을 선택하세요"}
          </h2>

          {selectedCourse && (
            <>
              <div className="flex gap-2 items-center border border-slate-700 rounded-lg p-3">
                <input className="input text-sm flex-1" placeholder="단원 제목" value={unitTitle} onChange={(e) => setUnitTitle(e.target.value)} />
                <input type="number" className="input text-sm w-16" placeholder="순서" min={0} value={unitOrder} onChange={(e) => setUnitOrder(Number(e.target.value))} />
                <button className="btn-primary text-sm px-3 shrink-0" onClick={handleAddUnit} disabled={addingUnit}>
                  {addingUnit ? "추가 중…" : "추가"}
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {units
                  .slice()
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((u) => (
                    <div key={u.id} className="bg-slate-800/40 border border-slate-700 rounded-lg px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{u.title}</p>
                        <p className="text-xs text-slate-500">순서: {u.order_index}</p>
                      </div>
                    </div>
                  ))}
                {units.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-4">단원이 없습니다.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
