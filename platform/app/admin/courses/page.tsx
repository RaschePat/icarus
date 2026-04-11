"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  getCourses, createCourse, getUnits, createUnit,
  assignInstructor, removeInstructor, getUsersByRole, getSections,
  createSection, deleteUnit, deleteSection, updateUnitOrder, updateSectionOrder,
} from "@/lib/api";
import type { Course, Unit, UserBasic, Section } from "@/lib/types";

export default function AdminCoursesPage() {
  const { data: session } = useSession();
  const token = (session?.user as { access_token?: string })?.access_token ?? "";

  const [courses, setCourses] = useState<Course[]>([]);
  const [selected, setSelected] = useState<Course | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [instructors, setInstructors] = useState<UserBasic[]>([]);
  const [loading, setLoading] = useState(true);

  // 과정 생성 폼
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [courseDuration, setCourseDuration] = useState(3);
  const [selectedInstructorId, setSelectedInstructorId] = useState("");

  // 단원 생성 폼
  const [unitTitle, setUnitTitle] = useState("");

  // 강사 배정 폼
  const [assignInstructorId, setAssignInstructorId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [msg, setMsg] = useState("");

  // 섹션 캐시 & 폼
  const [sectionMap, setSectionMap] = useState<Record<number, Section[]>>({});
  const [sectionInputs, setSectionInputs] = useState<Record<number, string>>({});
  const [creatingSection, setCreatingSection] = useState<number | null>(null);

  const loadCourses = () =>
    getCourses().then(setCourses).catch(() => {}).finally(() => setLoading(false));

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (token) {
      getUsersByRole("instructor", token).then(setInstructors).catch(() => {});
    }
  }, [token]);

  const loadUnits = (c: Course) => {
    setSelected(c);
    setAssignInstructorId("");
    setReassigning(false);
    setSectionMap({});
    getUnits(c.id).then(setUnits).catch(() => {});
  };

  const handleAddCourse = async () => {
    if (!courseTitle.trim()) return;
    setMsg("");
    try {
      const course = await createCourse({
        title: courseTitle,
        description: courseDesc,
        duration_months: courseDuration,
      });
      if (selectedInstructorId && token) {
        await assignInstructor(course.id, selectedInstructorId, token).catch(() => {});
      }
      setCourseTitle(""); setCourseDesc(""); setSelectedInstructorId("");
      setMsg(`✓ '${course.title}' 과정이 생성됐습니다.`);
      loadCourses();
    } catch (e) {
      setMsg(`오류: ${(e as Error).message}`);
    }
  };

  const handleAddUnit = async () => {
    if (!unitTitle.trim() || !selected) return;
    setMsg("");
    try {
      const maxOrder = Math.max(0, ...units.map((u) => u.order_index));
      await createUnit(selected.id, { title: unitTitle, order_index: maxOrder + 1 });
      setUnitTitle("");
      loadUnits(selected);
      setMsg(`✓ 단원이 추가됐습니다.`);
    } catch (e) {
      setMsg(`오류: ${(e as Error).message}`);
    }
  };

  const handleDeleteUnit = async (courseId: number, unitId: number, unitTitle: string) => {
    if (!confirm(`단원 '${unitTitle}'을(를) 삭제하시겠습니까?`)) return;
    setMsg("");
    try {
      await deleteUnit(courseId, unitId);
      loadUnits(selected!);
      setMsg(`✓ 단원 '${unitTitle}'이 삭제되었습니다.`);
    } catch (e) {
      setMsg(`오류: ${(e as Error).message}`);
    }
  };

  const handleMoveUnit = async (unitId: number, direction: "up" | "down") => {
    const unit = units.find((u) => u.id === unitId);
    if (!unit || !selected) return;

    const newOrder = direction === "up" ? unit.order_index - 1 : unit.order_index + 1;
    if (newOrder < 0 || newOrder >= units.length) return;

    setMsg("");
    try {
      await updateUnitOrder(selected.id, unitId, newOrder);
      loadUnits(selected);
    } catch (e) {
      setMsg(`오류: ${(e as Error).message}`);
    }
  };

  const handleAddSection = async (unitId: number) => {
    if (!selected || !sectionInputs[unitId]?.trim()) return;
    setCreatingSection(unitId);
    setMsg("");
    try {
      const sections = sectionMap[unitId] || [];
      const maxOrder = Math.max(-1, ...sections.map((s) => s.section_order));
      await createSection(selected.id, unitId, {
        title: sectionInputs[unitId].trim(),
        order: maxOrder + 1,
      });
      setSectionInputs((prev) => ({ ...prev, [unitId]: "" }));
      const updated = await getSections(selected.id, unitId).catch(() => [] as Section[]);
      setSectionMap((prev) => ({ ...prev, [unitId]: updated }));
      setMsg(`✓ 섹션이 추가되었습니다.`);
    } catch (e) {
      setMsg(`오류: ${(e as Error).message}`);
    } finally {
      setCreatingSection(null);
    }
  };

  const handleDeleteSection = async (courseId: number, unitId: number, sectionId: string, sectionTitle: string) => {
    if (!confirm(`섹션 '${sectionTitle}'을(를) 삭제하시겠습니까?`)) return;
    setMsg("");
    try {
      await deleteSection(courseId, unitId, sectionId);
      const updated = await getSections(courseId, unitId).catch(() => [] as Section[]);
      setSectionMap((prev) => ({ ...prev, [unitId]: updated }));
      setMsg(`✓ 섹션이 삭제되었습니다.`);
    } catch (e) {
      setMsg(`오류: ${(e as Error).message}`);
    }
  };

  const handleMoveSection = async (courseId: number, unitId: number, sectionId: string, direction: "up" | "down") => {
    const sections = sectionMap[unitId] || [];
    const section = sections.find((s) => s.lesson_id === sectionId);
    if (!section) return;

    const newOrder = direction === "up" ? section.section_order - 1 : section.section_order + 1;
    if (newOrder < 0 || newOrder >= sections.length) return;

    setMsg("");
    try {
      await updateSectionOrder(courseId, unitId, sectionId, newOrder);
      const updated = await getSections(courseId, unitId).catch(() => [] as Section[]);
      setSectionMap((prev) => ({ ...prev, [unitId]: updated }));
    } catch (e) {
      setMsg(`오류: ${(e as Error).message}`);
    }
  };

  const handleAssign = async () => {
    if (!assignInstructorId || !selected || !token) return;
    setAssigning(true);
    try {
      await assignInstructor(selected.id, assignInstructorId, token);
      setMsg("✓ 강사 배정 완료");
      setAssignInstructorId("");
      setReassigning(false);
      loadCourses();
    } catch (e) {
      setMsg(`오류: ${(e as Error).message}`);
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveInstructor = async (courseId: number, instructorId: string) => {
    if (!token || !confirm("강사 배정을 해제하시겠습니까?")) return;
    await removeInstructor(courseId, instructorId, token).catch(() => {});
    loadCourses();
    if (selected?.id === courseId) {
      setSelected((prev) => prev ? { ...prev, instructor_id: null } : prev);
    }
  };

  const instructorName = (uid: string | null | undefined) =>
    instructors.find((i) => i.user_id === uid)?.name ?? uid;

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold">과정 생성 / 관리</h1>
        <p className="text-slate-400 text-sm mt-0.5">과정 및 단원을 관리하고 강사를 배정합니다.</p>
      </div>

      {msg && (
        <p className={`text-xs px-3 py-2 rounded-lg ${
          msg.startsWith("오류")
            ? "bg-red-950/30 text-red-300 border border-red-500/30"
            : "bg-emerald-950/30 text-emerald-300 border border-emerald-500/30"
        }`}>
          {msg}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── 과정 목록 + 생성 ── */}
        <div className="card flex flex-col gap-4">
          <h2 className="font-semibold text-sm">과정 관리</h2>

          <div className="flex flex-col gap-2 border border-slate-700 rounded-lg p-3">
            <input className="input text-sm" placeholder="과정 제목" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} />
            <input className="input text-sm" placeholder="설명" value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)} />
            <div className="flex gap-2 items-center">
              <label className="text-xs text-slate-400 shrink-0">기간(월)</label>
              <input type="number" className="input text-sm w-20" min={1} value={courseDuration} onChange={(e) => setCourseDuration(Number(e.target.value))} />
            </div>

            <div>
              <label className="label">담당 강사 (선택)</label>
              <select className="input text-sm" value={selectedInstructorId} onChange={(e) => setSelectedInstructorId(e.target.value)}>
                <option value="">— 선택 안 함 —</option>
                {instructors.map((i) => (
                  <option key={i.user_id} value={i.user_id}>{i.name} ({i.email})</option>
                ))}
              </select>
            </div>

            <button className="btn-primary text-sm" onClick={handleAddCourse}>과정 추가</button>
          </div>

          {loading && <p className="text-slate-500 text-sm animate-pulse">불러오는 중…</p>}
          <div className="flex flex-col gap-2">
            {courses.map((c) => (
              <button key={c.id} onClick={() => loadUnits(c)}
                className={`text-left rounded-lg px-4 py-3 border transition-colors ${
                  selected?.id === c.id ? "bg-blue-900/30 border-blue-500/50 text-blue-200" : "bg-slate-800/40 border-slate-700 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm">{c.title}</p>
                  <span className="badge bg-slate-700 text-slate-300 text-xs shrink-0">{c.duration_months}개월</span>
                </div>
                {c.instructor_id && (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-slate-400">담당: {instructorName(c.instructor_id)}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveInstructor(c.id, c.instructor_id!); }}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      배정 해제
                    </button>
                  </div>
                )}
              </button>
            ))}
            {!loading && courses.length === 0 && <p className="text-slate-500 text-sm text-center py-4">과정이 없습니다.</p>}
          </div>
        </div>

        {/* ── 단원 + 강사 배정 ── */}
        <div className="flex flex-col gap-4">
          {selected && (
            <div className="card flex flex-col gap-3">
              <h2 className="font-semibold text-sm">{selected.title} — 강사 배정</h2>

              {selected.instructor_id && !reassigning ? (
                <div className="flex items-center justify-between bg-emerald-950/30 border border-emerald-500/30 rounded-lg px-4 py-2.5">
                  <div>
                    <p className="text-xs text-emerald-400 font-medium">배정 완료</p>
                    <p className="text-sm text-slate-200">{instructorName(selected.instructor_id)}</p>
                  </div>
                  <button className="btn-ghost text-xs" onClick={() => setReassigning(true)}>
                    재배정
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {selected.instructor_id && (
                    <p className="text-xs text-slate-500">현재 담당: {instructorName(selected.instructor_id)}</p>
                  )}
                  <div className="flex gap-2">
                    <select className="input text-sm flex-1" value={assignInstructorId} onChange={(e) => setAssignInstructorId(e.target.value)}>
                      <option value="">— 강사 선택 —</option>
                      {instructors.map((i) => (
                        <option key={i.user_id} value={i.user_id}>{i.name} ({i.email})</option>
                      ))}
                    </select>
                    <button className="btn-primary text-sm px-4 shrink-0" onClick={handleAssign} disabled={assigning || !assignInstructorId}>
                      {assigning ? "배정 중…" : "배정"}
                    </button>
                    {reassigning && (
                      <button className="btn-ghost text-sm px-3 shrink-0" onClick={() => setReassigning(false)}>
                        취소
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="card flex flex-col gap-4">
            <h2 className="font-semibold text-sm">{selected ? `${selected.title} — 단원` : "과정을 선택하세요"}</h2>
            {selected && (
              <>
                <div className="flex gap-2 border border-slate-700 rounded-lg p-3">
                  <input className="input text-sm flex-1" placeholder="단원 제목 (예: 1단원 변수와 자료형)" value={unitTitle} onChange={(e) => setUnitTitle(e.target.value)} />
                  <button className="btn-primary text-sm px-3 shrink-0" onClick={handleAddUnit}>추가</button>
                </div>
                <div className="flex flex-col gap-3">
                  {units.sort((a, b) => a.order_index - b.order_index).map((u, idx) => (
                    <div key={u.id} className="bg-slate-800/40 border border-slate-700 rounded-lg p-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{u.title}</p>
                          <p className="text-xs text-slate-500">순서: {u.order_index}</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            className="text-xs px-1.5 py-1 rounded bg-slate-700 hover:bg-slate-600"
                            onClick={() => handleMoveUnit(u.id, "up")}
                            disabled={idx === 0}
                          >
                            ↑
                          </button>
                          <button
                            className="text-xs px-1.5 py-1 rounded bg-slate-700 hover:bg-slate-600"
                            onClick={() => handleMoveUnit(u.id, "down")}
                            disabled={idx === units.length - 1}
                          >
                            ↓
                          </button>
                          <button
                            className="text-xs px-1.5 py-1 rounded bg-red-900/40 text-red-400 hover:bg-red-900/60"
                            onClick={() => handleDeleteUnit(selected.id, u.id, u.title)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* 섹션 추가 폼 */}
                      <div className="flex gap-1">
                        <input
                          type="text"
                          className="input text-xs flex-1"
                          placeholder="섹션명 (예: 1-1강)"
                          value={sectionInputs[u.id] || ""}
                          onChange={(e) => setSectionInputs((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && handleAddSection(u.id)}
                        />
                        <button
                          className="btn-primary text-xs px-2 shrink-0"
                          onClick={() => handleAddSection(u.id)}
                          disabled={creatingSection === u.id}
                        >
                          {creatingSection === u.id ? "중…" : "+"}
                        </button>
                      </div>

                      {/* 섹션 목록 */}
                      {(sectionMap[u.id] || []).length > 0 && (
                        <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-slate-700/50">
                          {sectionMap[u.id]!.sort((a, b) => a.section_order - b.section_order).map((s, sidx) => (
                            <div key={s.lesson_id} className="flex items-center justify-between gap-1 bg-slate-700/50 px-2 py-1 rounded text-xs">
                              <span className="text-slate-300">{s.section_title || `섹션 ${s.section_order + 1}`}</span>
                              <div className="flex gap-0.5">
                                <button
                                  className="text-slate-400 hover:text-slate-200"
                                  onClick={() => handleMoveSection(selected.id, u.id, s.lesson_id, "up")}
                                  disabled={sidx === 0}
                                >
                                  ↑
                                </button>
                                <button
                                  className="text-slate-400 hover:text-slate-200"
                                  onClick={() => handleMoveSection(selected.id, u.id, s.lesson_id, "down")}
                                  disabled={sidx === sectionMap[u.id]!.length - 1}
                                >
                                  ↓
                                </button>
                                <button
                                  className="text-red-400 hover:text-red-300"
                                  onClick={() => handleDeleteSection(selected.id, u.id, s.lesson_id, s.section_title || `섹션 ${s.section_order + 1}`)}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {units.length === 0 && <p className="text-slate-500 text-sm text-center py-4">단원이 없습니다.</p>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
