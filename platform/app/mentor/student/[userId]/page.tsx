import { getUserProfile, getMicroProjects } from "@/lib/api";
import { notFound } from "next/navigation";
import Link from "next/link";
import AptitudeRadarChart, { AptitudeBarSummary } from "@/components/student/AptitudeRadarChart";
import CareerIdentityBadge from "@/components/student/CareerIdentityBadge";
import MicroProjectList from "@/components/student/MicroProjectList";
import InterestProfileCard from "@/components/student/InterestProfileCard";
import type { MicroProject } from "@/lib/types";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function MentorStudentDetailPage({ params }: PageProps) {
  const { userId } = await params;

  let profile;
  let projects: MicroProject[] = [];

  try {
    profile = await getUserProfile(userId);
    projects = await getMicroProjects(userId);
  } catch {
    notFound();
  }

  if (!profile) notFound();

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col gap-6">
      <Link href="/mentor" className="text-slate-400 hover:text-slate-200 text-sm transition-colors w-fit">
        ← 내 학생 목록
      </Link>

      {/* 헤더 */}
      <div className="card flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{userId}</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {profile.session_count}회 세션 완료 · 마지막 업데이트 {new Date(profile.last_updated).toLocaleDateString("ko-KR")}
          </p>
          <div className="mt-3">
            <CareerIdentityBadge tags={profile.career_identity} size="md" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-6">
          {/* 레이더 차트 */}
          <div className="card">
            <p className="section-title">누적 적성 레이더</p>
            <AptitudeRadarChart aptitude={profile.cumulative_aptitude} size="lg" />
          </div>

          {/* 마이크로 프로젝트 */}
          <div className="card">
            <p className="section-title">마이크로 프로젝트</p>
            <MicroProjectList projects={projects} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card">
            <p className="section-title">누적 적성 점수</p>
            <AptitudeBarSummary aptitude={profile.cumulative_aptitude} />
          </div>

          {profile.interest_profile && (
            <InterestProfileCard interest={profile.interest_profile} />
          )}
        </div>
      </div>
    </div>
  );
}
