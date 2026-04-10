"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getMyCourses, getUnits, getSections } from "@/lib/api";
import type { Course, Unit, Section } from "@/lib/types";

export default function InstructorPage() {
  const { data: session } = useSession();
  const token = (session?.user as { access_token?: string })?.access_token ?? "";
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // 펼쳐진 과정/단원 ID
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [expandedUnit, setExpandedUnit] = useState<number | null>(null);

  // 단원 / 섹션 캐시
  const [unitMap, setUnitMap] = useState<Record<number, Unit[]>>({});
  const [sectionMap, setSectionMap] = useState<Record<number, Section[]>>({});

  useEffect(() => {
    if (!token) return;
    getMyCourses(token)
      .then(setCourses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const toggleCourse = async (course: Course) => {
    if (expandedCourse === course.id) {
      setExpandedCourse(null);
      setExpandedUnit(null);
      return;
    }
    setExpandedCourse(course.id);
    setExpandedUnit(null);
    if (!unitMap[course.id]) {
      const units = await getUnits(course.id).catch(() => [] as Unit[]);
      setUnitMap((prev) => ({ ...prev, [course.id]: units }));
    }
  };

  const toggleUnit = async (courseId: number, unit: Unit) => {
    if (expandedUnit === unit.id) {
      setExpandedUnit(null);
      return;
    }
    setExpandedUnit(unit.id);
    if (!sectionMap[unit.id]) {
      const sections = await getSections(courseId, unit.id).catch(() => [] as Section[]);
      setSectionMap((prev) => ({ ...prev, [unit.id]: sections }));
    }
  };

  const handleSectionClick = (section: Section) => {
    router.push(`/instructor/lesson/${section.lesson_id}`);
  };

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold">강의 콘솔</h1>
        <p className="text-slate-400 text-sm mt-0.5">과정 → 단원 → 섹션을 선택해 수업을 시작하세요.</p>
      </div>

      {loading && <p className="text-slate-500 text-sm animate-pulse">과정 목록을 불러오는 중…</p>}

      {!loading && courses.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-slate-400 text-sm">배정된 과정이 없습니다.</p>
          <p className="text-slate-600 text-xs mt-1">운영자에게 과정 배정을 요청하세요.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {courses.map((course) => {
          const isExpanded = expandedCourse === course.id;
          const units = unitMap[course.id] ?? [];

          return (
            <div key={course.id} className="rounded-lg border border-slate-700 overflow-hidden">
              {/* 과정 행 */}
              <button
                className={`w-full text-left px-5 py-4 flex items-center justify-between transition-colors ${
                  isExpanded ? "bg-blue-900/30" : "bg-slate-800/40 hover:bg-slate-800"
                }`}
                onClick={() => toggleCourse(course)}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-sm transition-transform ${isExpanded ? "rotate-90" : ""}`}>▶</span>
                  <div>
                    <p className="font-semibold">{course.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{course.description || "설명 없음"}</p>
                  </div>
                </div>
                <span className="badge bg-slate-700 text-slate-400 text-xs shrink-0">
                  {course.duration_months}개월
                </span>
              </button>

              {/* 단원 목록 */}
              {isExpanded && (
                <div className="border-t border-slate-700">
                  {units.length === 0 ? (
                    <p className="px-8 py-3 text-sm text-slate-500">단원이 없습니다.</p>
                  ) : (
                    units.sort((a, b) => a.order_index - b.order_index).map((unit) => {
                      const isUnitExpanded = expandedUnit === unit.id;
                      const sections = sectionMap[unit.id] ?? [];

                      return (
                        <div key={unit.id} className="border-b border-slate-700/50 last:border-0">
                          {/* 단원 행 */}
                          <button
                            className={`w-full text-left px-8 py-3 flex items-center justify-between transition-colors ${
                              isUnitExpanded ? "bg-slate-700/30" : "hover:bg-slate-800/60"
                            }`}
                            onClick={() => toggleUnit(course.id, unit)}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-xs text-slate-500 transition-transform ${isUnitExpanded ? "rotate-90" : ""}`}>▶</span>
                              <p className="text-sm font-medium">{unit.title}</p>
                            </div>
                            <span className="text-xs text-slate-600">순서 {unit.order_index}</span>
                          </button>

                          {/* 섹션(수업일) 목록 */}
                          {isUnitExpanded && (
                            <div className="px-12 py-2 flex flex-col gap-1">
                              {sections.length === 0 ? (
                                <p className="text-xs text-slate-500 py-2">섹션이 없습니다.</p>
                              ) : (
                                sections.map((section) => (
                                  <button
                                    key={section.lesson_id}
                                    onClick={() => handleSectionClick(section)}
                                    className="text-left px-4 py-2.5 rounded-lg bg-slate-800/50 hover:bg-blue-900/30 hover:border-blue-500/30 border border-slate-700/50 transition-colors"
                                  >
                                    <div className="flex items-center justify-between">
                                      <p className="text-sm">{section.section_title || `섹션 ${section.section_order + 1}`}</p>
                                      <span className="text-xs text-blue-400">수업 시작 →</span>
                                    </div>
                                    <p className="text-xs text-slate-600 font-mono mt-0.5">{section.lesson_id}</p>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
