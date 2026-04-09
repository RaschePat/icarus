import { notFound } from "next/navigation";
import Link from "next/link";
import AptitudeRadarChart, { AptitudeBarSummary } from "@/components/AptitudeRadarChart";
import CareerIdentityBadge from "@/components/CareerIdentityBadge";
import SessionReportView from "@/components/SessionReportView";
import RedFlagList from "@/components/RedFlagList";
import InterestProfileCard from "@/components/InterestProfileCard";
import MicroProjectList from "@/components/MicroProjectList";
import { getDemoProfile, getDemoSessions, getDemoProjects, DEMO_REDFLAGS, DEMO_STUDENTS } from "@/lib/demo";

interface PageProps {
  params: Promise<{ userId: string }>;
}

function calcClassAvg() {
  const n = DEMO_STUDENTS.length || 1;
  return {
    logic_avg:    DEMO_STUDENTS.reduce((a, s) => a + s.aptitude.logic_avg,    0) / n,
    planning_avg: DEMO_STUDENTS.reduce((a, s) => a + s.aptitude.planning_avg, 0) / n,
    ux_avg:       DEMO_STUDENTS.reduce((a, s) => a + s.aptitude.ux_avg,       0) / n,
    data_avg:     DEMO_STUDENTS.reduce((a, s) => a + s.aptitude.data_avg,     0) / n,
  };
}

export default async function StudentDetailPage({ params }: PageProps) {
  const { userId } = await params;
  const profile  = getDemoProfile(userId);
  const sessions = getDemoSessions(userId);
  const projects = getDemoProjects(userId);
  const redflags = DEMO_REDFLAGS.filter((r) => r.user_id === userId);
  const classAvg = calcClassAvg();
  const student  = DEMO_STUDENTS.find((s) => s.user_id === userId);

  if (!profile || !student) notFound();

  const lastSession = sessions[sessions.length - 1];
  const prevSession = sessions[sessions.length - 2];
  const focusDelta  = lastSession?.metrics && prevSession?.metrics
    ? ((lastSession.metrics.focus_ratio - prevSession.metrics.focus_ratio) * 100).toFixed(1)
    : null;

  return (
    <div className="flex flex-col gap-6">
      {/* 뒤로 가기 */}
      <Link href="/" className="text-slate-400 hover:text-slate-200 text-sm transition-colors w-fit">
        ← 전체 대시보드
      </Link>

      {/* 학생 헤더 */}
      <div className="card flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            {redflags.length > 0 && (
              <span className="text-2xl">
                {redflags[0].severity === "HIGH" ? "🚨" : "⚠️"}
              </span>
            )}
            <h1 className="text-2xl font-bold">{student.name}</h1>
          </div>
          <p className="text-slate-400 text-sm">
            {profile.session_count}회 세션 완료 ·
            마지막 업데이트 {new Date(profile.last_updated).toLocaleDateString("ko-KR")}
          </p>
          <div className="mt-3">
            <CareerIdentityBadge tags={profile.career_identity} size="md" />
          </div>
        </div>

        {/* 세션별 집중도 변화 */}
        {focusDelta !== null && (
          <div className={`text-center p-4 rounded-xl ${
            parseFloat(focusDelta) >= 0
              ? "bg-emerald-950/30 border border-emerald-500/30"
              : "bg-red-950/30 border border-red-500/30"
          }`}>
            <p className={`text-2xl font-bold ${parseFloat(focusDelta) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {parseFloat(focusDelta) >= 0 ? "+" : ""}{focusDelta}%
            </p>
            <p className="text-xs text-slate-400 mt-0.5">최근 집중도 변화</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-6">

          {/* 누적 적성 방사형 차트 */}
          <div className="card">
            <div className="flex items-center justify-between mb-1">
              <p className="section-title mb-0">누적 적성 레이더 (학급 평균 비교)</p>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-0.5 bg-indigo-500 rounded" /> 학생
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-0.5 bg-slate-500 rounded" style={{borderTop: "2px dashed #475569"}} /> 학급 평균
                </span>
              </div>
            </div>
            <AptitudeRadarChart
              aptitude={profile.cumulative_aptitude}
              baseline={classAvg}
              size="lg"
            />
          </div>

          {/* 세션별 분석 리포트 */}
          <div className="card">
            <p className="section-title">세션별 분석 리포트</p>
            <SessionReportView sessions={sessions} />
          </div>

          {/* 마이크로 프로젝트 목록 */}
          <div className="card">
            <p className="section-title">마이크로 프로젝트</p>
            <MicroProjectList projects={projects} />
          </div>
        </div>

        {/* 우측 사이드바 */}
        <div className="flex flex-col gap-4">
          {/* 적성 점수 상세 */}
          <div className="card">
            <p className="section-title">누적 적성 점수</p>
            <AptitudeBarSummary aptitude={profile.cumulative_aptitude} />

            {/* 학급 평균 대비 */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-500 mb-2">학급 평균 대비</p>
              {(["logic_avg", "planning_avg", "ux_avg", "data_avg"] as const).map((k) => {
                const label = { logic_avg: "Logic", planning_avg: "Planning", ux_avg: "UX", data_avg: "Data" }[k];
                const diff = profile.cumulative_aptitude[k] - classAvg[k];
                return (
                  <div key={k} className="flex justify-between text-xs py-1">
                    <span className="text-slate-400">{label}</span>
                    <span className={diff >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {diff >= 0 ? "+" : ""}{diff.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RED FLAG */}
          {redflags.length > 0 && (
            <RedFlagList redflags={redflags} />
          )}

          {/* 관심사 프로필 */}
          {profile.interest_profile && (
            <InterestProfileCard interest={profile.interest_profile} />
          )}

          {/* career_identity 설명 */}
          <div className="card">
            <p className="section-title">적성 태그 기준</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              5회 이상 세션에서 특정 성향의 누적 평균이
              전체 평균의 <span className="text-indigo-400 font-semibold">1.5배 이상</span>일 때 태그가 부여됩니다.
              최대 2개까지 허용됩니다.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800 text-xs space-y-1 text-slate-500">
              <p>전체 평균: {(Object.values(profile.cumulative_aptitude).reduce((a, b) => a + b, 0) / 4).toFixed(1)}</p>
              <p>부여 기준선: {((Object.values(profile.cumulative_aptitude).reduce((a, b) => a + b, 0) / 4) * 1.5).toFixed(1)}</p>
              <p>누적 세션: {profile.session_count}회 {profile.session_count < 5 ? `(${5 - profile.session_count}회 더 필요)` : "✓"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
