"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getMentorStudents, addMentorStudent, removeMentorStudent, getUsersByRole, getStudentCourses } from "@/lib/api";
import Link from "next/link";
import type { MentorStudentItem, AptitudeScores, UserBasic } from "@/lib/types";

function AptitudeMini({ aptitude }: { aptitude: AptitudeScores }) {
  const bars = [
    { label: "Logic", value: aptitude.logic_avg, color: "bg-violet-500" },
    { label: "Plan", value: aptitude.planning_avg, color: "bg-blue-500" },
    { label: "UX", value: aptitude.ux_avg, color: "bg-emerald-500" },
    { label: "Data", value: aptitude.data_avg, color: "bg-amber-500" },
  ];
  return (
    <div className="flex flex-col gap-1 mt-2">
      {bars.map(({ label, value, color }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-8 shrink-0">{label}</span>
          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${color}`}
              style={{ width: `${Math.min(100, value)}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 w-7 text-right">{value.toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
}

export default function MentorPage() {
  const { data: session } = useSession();
  const mentorId = (session?.user as { user_id?: string })?.user_id ?? "";
  const token = (session?.user as { access_token?: string })?.access_token ?? "";

  const [students, setStudents] = useState<MentorStudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentCourses, setStudentCourses] = useState<Record<string, string[]>>({});

  // 이메일 검색 상태
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState<UserBasic[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState("");
  const [adding, setAdding] = useState<string | null>(null); // 추가 중인 student_id

  const load = async () => {
    if (!mentorId) return;
    try {
      const data = await getMentorStudents(mentorId);
      setStudents(data);
      // 각 학생의 배정 과정 목록 로드
      const coursesMap: Record<string, string[]> = {};
      for (const student of data) {
        try {
          const courses = await getStudentCourses(student.user_id);
          coursesMap[student.user_id] = courses.map((c) => c.title);
        } catch {
          coursesMap[student.user_id] = [];
        }
      }
      setStudentCourses(coursesMap);
    } catch {
      // error ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [mentorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async () => {
    const q = searchEmail.trim();
    if (!q || !token) return;
    setSearching(true);
    setSearchMsg("");
    setSearchResults([]);
    try {
      const results = await getUsersByRole("student", token, q);
      if (results.length === 0) setSearchMsg("검색 결과가 없습니다.");
      setSearchResults(results);
    } catch (e) {
      setSearchMsg(`오류: ${(e as Error).message}`);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (student: UserBasic) => {
    setAdding(student.user_id);
    try {
      await addMentorStudent(mentorId, student.user_id);
      setSearchResults((prev) => prev.filter((s) => s.user_id !== student.user_id));
      load();
    } catch (e) {
      setSearchMsg(`오류: ${(e as Error).message}`);
    } finally {
      setAdding(null);
    }
  };

  const handleRemove = async (studentId: string) => {
    if (!confirm("이 학생을 제거하시겠습니까?")) return;
    await removeMentorStudent(mentorId, studentId).catch(() => {});
    load();
  };

  const formatLastActive = (dateStr: string | null) => {
    if (!dateStr) return "활동 없음";
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return "오늘";
    if (days === 1) return "어제";
    if (days < 7) return `${days}일 전`;
    return d.toLocaleDateString("ko-KR");
  };

  const alreadyAdded = new Set(students.map((s) => s.user_id));

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold">내 학생 목록</h1>
        <p className="text-slate-400 text-sm mt-0.5">담당 학생의 상세 분석을 확인하세요.</p>
      </div>

      {/* 학생 검색 & 추가 */}
      <div className="card flex flex-col gap-3">
        <h2 className="font-semibold text-sm">학생 추가</h2>
        <div className="flex gap-2">
          <input
            className="input text-sm flex-1"
            placeholder="학생 이메일로 검색"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            className="btn-primary text-sm px-4 shrink-0"
            onClick={handleSearch}
            disabled={searching || !searchEmail.trim()}
          >
            {searching ? "검색 중…" : "검색"}
          </button>
        </div>

        {searchMsg && <p className="text-xs text-slate-400">{searchMsg}</p>}

        {searchResults.length > 0 && (
          <div className="flex flex-col gap-1 border border-slate-700 rounded-lg divide-y divide-slate-700/50">
            {searchResults.map((s) => (
              <div key={s.user_id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.email}</p>
                </div>
                {alreadyAdded.has(s.user_id) ? (
                  <span className="text-xs text-slate-500">이미 추가됨</span>
                ) : (
                  <button
                    className="btn-primary text-xs px-3"
                    onClick={() => handleAdd(s)}
                    disabled={adding === s.user_id}
                  >
                    {adding === s.user_id ? "추가 중…" : "추가"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 학생 목록 */}
      <div className="flex flex-col gap-3">
        <h2 className="font-semibold text-sm text-slate-300">담당 학생 ({students.length}명)</h2>
        {loading && <p className="text-slate-500 text-sm animate-pulse">불러오는 중…</p>}
        {!loading && students.length === 0 && (
          <div className="card text-center py-8">
            <p className="text-slate-500 text-sm">담당 학생이 없습니다.</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((s) => (
            <div key={s.user_id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs text-slate-500">{formatLastActive(s.last_updated)}</span>
                  <span className="badge bg-slate-700 text-slate-400 text-xs">{s.session_count}세션</span>
                </div>
              </div>

              {s.top_category && (
                <span className="badge bg-blue-900/40 text-blue-300 text-xs w-fit">
                  {s.top_category}
                </span>
              )}

              {s.career_identity.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {s.career_identity.slice(0, 3).map((tag) => (
                    <span key={tag} className="badge bg-emerald-900/30 text-emerald-400 text-xs">
                      {tag}
                    </span>
                  ))}
                  {s.career_identity.length > 3 && (
                    <span className="text-xs text-slate-600">+{s.career_identity.length - 3}</span>
                  )}
                </div>
              )}

              {/* 배정된 과정 */}
              {(studentCourses[s.user_id] || []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {studentCourses[s.user_id].slice(0, 2).map((courseName) => (
                    <span key={courseName} className="badge bg-slate-700/60 text-slate-300 text-xs">
                      {courseName}
                    </span>
                  ))}
                  {studentCourses[s.user_id].length > 2 && (
                    <span className="text-xs text-slate-600">+{studentCourses[s.user_id].length - 2}</span>
                  )}
                </div>
              )}

              <AptitudeMini aptitude={s.aptitude} />

              <div className="flex gap-2 mt-1">
                <Link
                  href={`/mentor/student/${s.user_id}`}
                  className="btn-primary text-xs flex-1 text-center"
                >
                  상세 보기
                </Link>
                <button
                  onClick={() => handleRemove(s.user_id)}
                  className="btn-danger text-xs px-3 shrink-0"
                >
                  제거
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
