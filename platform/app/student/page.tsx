"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getUserProfile, getTodayLesson, getMicroProjects } from "@/lib/api";
import type { UserProfile, MicroProject } from "@/lib/types";
import AptitudeRadarChart from "@/components/student/AptitudeRadarChart";
import CareerIdentityBadge from "@/components/student/CareerIdentityBadge";

export default function StudentHomePage() {
  const { data: session } = useSession();
  const userId = (session?.user as { user_id?: string })?.user_id ?? "";

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayLesson, setTodayLesson] = useState<string | null>(null);
  const [projects, setProjects] = useState<MicroProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      getUserProfile(userId).catch(() => null),
      getTodayLesson().catch(() => ({ lesson_id: null })),
      getMicroProjects(userId).catch(() => []),
    ]).then(([prof, lesson, projs]) => {
      setProfile(prof);
      setTodayLesson(lesson.lesson_id);
      setProjects(projs);
      setLoading(false);
    });
  }, [userId]);

  if (loading) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-10 flex items-center justify-center">
        <span className="text-slate-500 animate-pulse">불러오는 중…</span>
      </div>
    );
  }

  const completed = projects.filter((p) => p.harness_filled >= p.harness_total).length;

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold">내 학습 현황</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          안녕하세요, {session?.user?.name ?? "수강생"}님
        </p>
      </div>

      {/* 오늘 수업 상태 */}
      <div className={`card flex items-center gap-4 ${todayLesson ? "border-blue-500/40" : ""}`}>
        <div className="text-2xl">{todayLesson ? "📚" : "📭"}</div>
        <div>
          <p className="font-semibold text-sm">
            {todayLesson ? "오늘 수업이 배포되었습니다" : "아직 오늘 수업이 없습니다"}
          </p>
          {todayLesson && (
            <p className="text-xs text-slate-400 mt-0.5 font-mono">lesson_id: {todayLesson}</p>
          )}
        </div>
        {todayLesson && (
          <span className="badge bg-blue-900/40 text-blue-300 ml-auto">Wing에서 자동 동기화됨</span>
        )}
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "누적 세션", value: `${profile?.session_count ?? 0}회`, color: "text-slate-100" },
          { label: "마이크로 프로젝트", value: `${projects.length}개`, color: "text-blue-300" },
          { label: "완성한 프로젝트", value: `${completed}개`, color: "text-emerald-300" },
          { label: "진행 중", value: `${projects.length - completed}개`, color: "text-amber-300" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* 적성 + 커리어 아이덴티티 */}
      {profile && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <p className="section-title">누적 적성 레이더</p>
            <AptitudeRadarChart aptitude={profile.cumulative_aptitude} size="md" />
          </div>
          <div className="card flex flex-col gap-4">
            <p className="section-title">커리어 아이덴티티</p>
            <CareerIdentityBadge tags={profile.career_identity} size="md" />
            <p className="text-xs text-slate-500 leading-relaxed">
              5회 이상 세션에서 특정 성향의 누적 평균이 전체 평균의 1.5배 이상일 때 태그가 부여됩니다.
              {profile.session_count < 5 && (
                <span className="text-amber-400"> (${5 - profile.session_count}회 더 필요)</span>
              )}
            </p>
          </div>
        </div>
      )}

      {!profile && (
        <div className="card text-center py-8">
          <p className="text-slate-500 text-sm">아직 세션 기록이 없습니다. Wing 에이전트를 사용해보세요!</p>
        </div>
      )}
    </div>
  );
}
