"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getUserProfile } from "@/lib/api";
import type { UserProfile } from "@/lib/types";
import AptitudeRadarChart, { AptitudeBarSummary } from "@/components/student/AptitudeRadarChart";
import CareerIdentityBadge from "@/components/student/CareerIdentityBadge";
import InterestProfileCard from "@/components/student/InterestProfileCard";

export default function StudentAptitudePage() {
  const { data: session } = useSession();
  const userId = (session?.user as { user_id?: string })?.user_id ?? "";
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    getUserProfile(userId)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-10">
        <span className="text-slate-500 animate-pulse">불러오는 중…</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-10 text-center">
        <p className="text-slate-500">아직 적성 데이터가 없습니다. Wing 에이전트로 코딩을 시작해보세요!</p>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold">내 적성 / 관심사 분석</h1>
        <p className="text-slate-400 text-sm mt-0.5">누적 {profile.session_count}회 세션 분석 결과</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 레이더 차트 */}
        <div className="card">
          <p className="section-title">누적 적성 레이더</p>
          <AptitudeRadarChart aptitude={profile.cumulative_aptitude} size="lg" />
        </div>

        {/* 점수 상세 */}
        <div className="flex flex-col gap-4">
          <div className="card">
            <p className="section-title">적성 점수 상세</p>
            <AptitudeBarSummary aptitude={profile.cumulative_aptitude} />
          </div>

          <div className="card">
            <p className="section-title">커리어 아이덴티티</p>
            <CareerIdentityBadge tags={profile.career_identity} size="md" />
            {profile.session_count < 5 && (
              <p className="text-xs text-amber-400 mt-3">
                태그 부여까지 {5 - profile.session_count}회 세션이 더 필요합니다.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 관심사 프로필 */}
      {profile.interest_profile && (
        <InterestProfileCard interest={profile.interest_profile} />
      )}
    </div>
  );
}
