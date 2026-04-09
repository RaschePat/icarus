import type { UserProfile, Session } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/v1";

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const res = await fetch(`${BASE}/user/profile/${userId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`프로필 조회 실패 (${res.status})`);
  const data = await res.json();
  // 백엔드 응답 형식 → 내부 타입으로 정규화
  return {
    user_id: data.user_id,
    cumulative_aptitude: data.cumulative_aptitude,
    session_count: data.session_count,
    career_identity: data.career_identity ?? [],
    last_updated: data.last_updated,
  };
}

export async function fetchInsightReport(sessionId: string): Promise<{
  radar_data: { subject: string; score: number }[];
  ai_comment: string;
}> {
  const res = await fetch(`${BASE}/insight/report/${sessionId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`리포트 조회 실패 (${res.status})`);
  return res.json();
}
