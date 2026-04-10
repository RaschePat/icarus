"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getMentorStudentDetail, getCourses, getUnits, getSections, enrollStudent,
} from "@/lib/api";
import Link from "next/link";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import AptitudeRadarChart, { AptitudeBarSummary } from "@/components/student/AptitudeRadarChart";
import CareerIdentityBadge from "@/components/student/CareerIdentityBadge";
import MicroProjectList from "@/components/student/MicroProjectList";
import InterestProfileCard from "@/components/student/InterestProfileCard";
import type { MentorStudentDetail, SessionSummary, Course, Unit, Section } from "@/lib/types";

// ── 집중도 추이 차트 ────────────────────────────────────────────────────────

function FocusChart({ sessions }: { sessions: SessionSummary[] }) {
  if (sessions.length === 0) return null;
  const data = [...sessions].reverse().map((s, i) => ({
    name: `세션 ${i + 1}`,
    focus: Math.round((s.focus_ratio ?? 0) * 100),
  }));
  return (
    <div className="card flex flex-col gap-3">
      <p className="section-title">집중도 추이</p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} unit="%" />
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
            labelStyle={{ color: "#94a3b8", fontSize: 11 }}
            formatter={(v: number) => [`${v}%`, "집중도"]}
          />
          <Line
            type="monotone"
            dataKey="focus"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ fill: "#6366f1", r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 세션 탭 ────────────────────────────────────────────────────────────────

function SessionTab({ session }: { session: SessionSummary }) {
  const apt = session.session_aptitude;
  const bars = [
    { label: "Logic", value: apt.logic_score, color: "bg-violet-500" },
    { label: "Planning", value: apt.planning_score, color: "bg-blue-500" },
    { label: "UX", value: apt.ux_score, color: "bg-emerald-500" },
    { label: "Data", value: apt.data_score, color: "bg-amber-500" },
  ];
  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-800/40 rounded-lg border border-slate-700">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono text-slate-400">{session.session_id.slice(0, 8)}…</p>
        <p className="text-xs text-slate-500">
          {new Date(session.timestamp_start).toLocaleDateString("ko-KR", {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          })}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        {bars.map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-14 shrink-0">{label}</span>
            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
            </div>
            <span className="text-xs text-slate-500 w-7 text-right">{value.toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 진로 정체성 ────────────────────────────────────────────────────────────

function CareerIdentitySection({ tags }: { tags: string[] }) {
  return (
    <div className="card flex flex-col gap-3">
      <p className="section-title">진로 정체성</p>
      {tags.length === 0 ? (
        <p className="text-slate-500 text-sm">아직 형성되지 않았습니다.</p>
      ) : (
        <>
          <CareerIdentityBadge tags={tags} size="md" />
          <p className="text-xs text-slate-500 leading-relaxed">
            <span className="text-slate-400 font-medium">1.5배 룰:</span>{" "}
            상위 카테고리 점수가 2위보다 1.5배 이상 높을 때 진로 정체성이 확정됩니다.
            현재 <span className="text-emerald-400">{tags.length}개</span> 정체성이 확정된 상태입니다.
          </p>
        </>
      )}
    </div>
  );
}

// ── RED_FLAG 이력 ──────────────────────────────────────────────────────────

function RedFlagHistory({ flags }: { flags: MentorStudentDetail["red_flags"] }) {
  if (flags.length === 0) return null;
  return (
    <div className="card flex flex-col gap-3">
      <p className="section-title text-red-400">RED FLAG 이력</p>
      <div className="flex flex-col gap-2">
        {flags.map((f) => (
          <div key={f.id} className={`rounded-lg px-4 py-3 border ${
            f.is_read ? "bg-slate-800/30 border-slate-700 text-slate-400" : "bg-red-950/30 border-red-500/30 text-red-200"
          }`}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-sm">{f.title}</p>
              <span className="text-xs text-slate-500 shrink-0">{new Date(f.created_at).toLocaleDateString("ko-KR")}</span>
            </div>
            <p className="text-xs mt-1 text-slate-400">{f.message}</p>
            {!f.is_read && <span className="badge bg-red-900/50 text-red-300 text-xs mt-1">미확인</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 과정 배정 섹션 ─────────────────────────────────────────────────────────

function EnrollSection({ studentId }: { studentId: string }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);

  const [enrolling, setEnrolling] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getCourses().then(setCourses).catch(() => {});
  }, []);

  const handleCourseChange = async (courseId: string) => {
    const course = courses.find((c) => String(c.id) === courseId) ?? null;
    setSelectedCourse(course);
    setSelectedUnit(null);
    setSelectedSection(null);
    setUnits([]);
    setSections([]);
    if (course) {
      const u = await getUnits(course.id).catch(() => [] as Unit[]);
      setUnits(u.sort((a, b) => a.order_index - b.order_index));
    }
  };

  const handleUnitChange = async (unitId: string) => {
    const unit = units.find((u) => String(u.id) === unitId) ?? null;
    setSelectedUnit(unit);
    setSelectedSection(null);
    setSections([]);
    if (unit && selectedCourse) {
      const s = await getSections(selectedCourse.id, unit.id).catch(() => [] as Section[]);
      setSections(s.sort((a, b) => a.section_order - b.section_order));
    }
  };

  const handleEnroll = async () => {
    if (!selectedSection) return;
    setEnrolling(true);
    setMsg("");
    try {
      await enrollStudent(selectedSection.lesson_id, studentId);
      setMsg(`✓ '${selectedSection.section_title || selectedSection.lesson_id}' 수업에 등록 완료`);
    } catch (e) {
      setMsg(`오류: ${(e as Error).message}`);
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="card flex flex-col gap-4">
      <h2 className="font-semibold text-sm">과정 배정</h2>

      {msg && (
        <p className={`text-xs px-3 py-2 rounded-lg ${
          msg.startsWith("오류")
            ? "bg-red-950/30 text-red-300 border border-red-500/30"
            : "bg-emerald-950/30 text-emerald-300 border border-emerald-500/30"
        }`}>
          {msg}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <select className="input text-sm" onChange={(e) => handleCourseChange(e.target.value)} defaultValue="">
          <option value="" disabled>— 과정 선택 —</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>

        {units.length > 0 && (
          <select className="input text-sm" onChange={(e) => handleUnitChange(e.target.value)} defaultValue="">
            <option value="" disabled>— 단원 선택 —</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.title}</option>
            ))}
          </select>
        )}

        {sections.length > 0 && (
          <select className="input text-sm" onChange={(e) => {
            const s = sections.find((sec) => sec.lesson_id === e.target.value) ?? null;
            setSelectedSection(s);
          }} defaultValue="">
            <option value="" disabled>— 섹션(수업일) 선택 —</option>
            {sections.map((s) => (
              <option key={s.lesson_id} value={s.lesson_id}>
                {s.section_title || `섹션 ${s.section_order + 1}`}
              </option>
            ))}
          </select>
        )}

        {selectedSection && (
          <button
            className="btn-primary text-sm"
            onClick={handleEnroll}
            disabled={enrolling}
          >
            {enrolling ? "등록 중…" : "수업 등록"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────

export default function MentorStudentDetailPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [detail, setDetail] = useState<MentorStudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    getMentorStudentDetail(userId)
      .then(setDetail)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-6">
        <p className="text-slate-500 text-sm animate-pulse">학생 정보를 불러오는 중…</p>
      </div>
    );
  }

  if (notFound || !detail) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col gap-4">
        <Link href="/mentor" className="text-slate-400 hover:text-slate-200 text-sm">
          ← 내 학생 목록
        </Link>
        <p className="text-red-400">학생 정보를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const profile = detail.profile;
  const hasRedFlag = detail.red_flags.some((f) => !f.is_read);

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col gap-6">
      <Link href="/mentor" className="text-slate-400 hover:text-slate-200 text-sm transition-colors w-fit">
        ← 내 학생 목록
      </Link>

      {/* 헤더 */}
      <div className="card flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{detail.name}</h1>
            {hasRedFlag && <span className="badge bg-red-900/50 text-red-300 text-xs">RED FLAG</span>}
          </div>
          <p className="text-slate-400 text-sm mt-0.5">{detail.email}</p>
          {profile && (
            <p className="text-slate-500 text-xs mt-1">
              {profile.session_count}회 세션 완료 · 마지막 업데이트 {new Date(profile.last_updated).toLocaleDateString("ko-KR")}
            </p>
          )}
        </div>
        {profile && (
          <div className="shrink-0">
            <AptitudeBarSummary aptitude={profile.cumulative_aptitude} />
          </div>
        )}
      </div>

      {/* 집중도 추이 */}
      <FocusChart sessions={detail.recent_sessions} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* 왼쪽 열 */}
        <div className="flex flex-col gap-6">
          {profile && (
            <div className="card">
              <p className="section-title">누적 적성 레이더</p>
              <AptitudeRadarChart aptitude={profile.cumulative_aptitude} size="lg" />
            </div>
          )}

          {detail.recent_sessions.length > 0 && (
            <div className="card flex flex-col gap-3">
              <p className="section-title">최근 세션 리포트</p>
              <div className="flex gap-1 flex-wrap">
                {detail.recent_sessions.map((s, i) => (
                  <button
                    key={s.session_id}
                    onClick={() => setActiveTab(i)}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                      activeTab === i ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                    }`}
                  >
                    세션 {i + 1}
                  </button>
                ))}
              </div>
              <SessionTab session={detail.recent_sessions[activeTab]} />
            </div>
          )}

          <div className="card">
            <p className="section-title">마이크로 프로젝트</p>
            <MicroProjectList projects={detail.micro_projects} />
          </div>

          <RedFlagHistory flags={detail.red_flags} />

          {/* 과정 배정 */}
          <EnrollSection studentId={userId} />
        </div>

        {/* 오른쪽 열 */}
        <div className="flex flex-col gap-4">
          <CareerIdentitySection tags={profile?.career_identity ?? []} />
          {profile?.interest_profile && (
            <InterestProfileCard interest={profile.interest_profile} />
          )}
        </div>
      </div>
    </div>
  );
}
