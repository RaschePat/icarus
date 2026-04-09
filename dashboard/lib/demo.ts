import type { StudentSummary, RedFlag, Session, UserProfile } from "./types";

// ── 학생 요약 목록 ────────────────────────────────────────────────────────

export const DEMO_STUDENTS: StudentSummary[] = [
  {
    user_id: "u1", name: "김지수", session_count: 8,
    career_identity: ["#Logic", "#Planning"],
    aptitude: { logic_avg: 78, planning_avg: 62, ux_avg: 22, data_avg: 31 },
    last_updated: "2026-04-09T10:32:00Z",
  },
  {
    user_id: "u2", name: "이현우", session_count: 6,
    career_identity: ["#UX"],
    aptitude: { logic_avg: 35, planning_avg: 41, ux_avg: 74, data_avg: 28 },
    red_flag: { severity: "MID", cause: "DIFFICULTY" },
    last_updated: "2026-04-09T10:28:00Z",
  },
  {
    user_id: "u3", name: "박소연", session_count: 10,
    career_identity: ["#Data", "#Logic"],
    aptitude: { logic_avg: 65, planning_avg: 29, ux_avg: 33, data_avg: 81 },
    last_updated: "2026-04-09T10:35:00Z",
  },
  {
    user_id: "u4", name: "최민준", session_count: 7,
    career_identity: [],
    aptitude: { logic_avg: 18, planning_avg: 22, ux_avg: 19, data_avg: 15 },
    red_flag: { severity: "HIGH", cause: "DISENGAGEMENT" },
    last_updated: "2026-04-09T09:10:00Z",
  },
  {
    user_id: "u5", name: "정다은", session_count: 5,
    career_identity: ["#Planning"],
    aptitude: { logic_avg: 42, planning_avg: 69, ux_avg: 38, data_avg: 30 },
    last_updated: "2026-04-09T10:33:00Z",
  },
  {
    user_id: "u6", name: "강태양", session_count: 9,
    career_identity: ["#UX", "#Planning"],
    aptitude: { logic_avg: 28, planning_avg: 58, ux_avg: 82, data_avg: 21 },
    last_updated: "2026-04-09T10:20:00Z",
  },
];

// ── RED FLAG 목록 ─────────────────────────────────────────────────────────

export const DEMO_REDFLAGS: RedFlag[] = [
  {
    user_id: "u4", name: "최민준", severity: "HIGH", cause: "DISENGAGEMENT",
    reason:
      "최근 3회 세션 연속 집중도 + 참여도 하락. 접속 시간과 시도 빈도 모두 감소. " +
      "동기 부여 면담 또는 학습 목표 재설정을 권장합니다.",
    detected_at: "2026-04-09T09:10:00Z",
  },
  {
    user_id: "u2", name: "이현우", severity: "MID", cause: "DIFFICULTY",
    reason:
      "최근 3회 세션 연속 집중도 하락. 에러 횟수는 높고 시도 빈도는 유지 중. " +
      "난이도 조정 또는 개념 설명 보강을 권장합니다.",
    detected_at: "2026-04-09T10:05:00Z",
  },
];

// ── 학생별 세션 히스토리 ──────────────────────────────────────────────────

export const DEMO_SESSIONS: Record<string, Session[]> = {
  u1: [
    {
      session_id: "s1-1", timestamp_start: "2026-04-02T09:00:00Z",
      session_aptitude: { logic_score: 72, planning_score: 55, ux_score: 18, data_score: 28 },
      metrics: { total_seconds: 3600, focused_seconds: 3100, distracted_seconds: 500, focus_ratio: 0.86, harness_error_count: 6, paste_ratio: 0.10, autonomy_score: 0.90 },
      ai_comment: "집중도 86%로 매우 우수. 자립도 90%로 스스로 코드를 작성하는 비율이 높습니다.",
    },
    {
      session_id: "s1-2", timestamp_start: "2026-04-04T09:00:00Z",
      session_aptitude: { logic_score: 80, planning_score: 65, ux_score: 20, data_score: 33 },
      metrics: { total_seconds: 3800, focused_seconds: 3400, distracted_seconds: 400, focus_ratio: 0.89, harness_error_count: 8, paste_ratio: 0.08, autonomy_score: 0.92 },
      ai_comment: "집중도 89%, 에러 시도 8회로 적극적인 학습 태도를 보입니다. #Logic #Planning 태그가 부여되었습니다.",
    },
    {
      session_id: "s1-3", timestamp_start: "2026-04-07T09:00:00Z",
      session_aptitude: { logic_score: 82, planning_score: 66, ux_score: 28, data_score: 32 },
      metrics: { total_seconds: 4000, focused_seconds: 3500, distracted_seconds: 500, focus_ratio: 0.875, harness_error_count: 9, paste_ratio: 0.09, autonomy_score: 0.91 },
      ai_comment: "꾸준한 성장세. 적성 태그 #Logic #Planning 강화되고 있습니다.",
    },
  ],
  u2: [
    {
      session_id: "s2-1", timestamp_start: "2026-04-03T10:00:00Z",
      session_aptitude: { logic_score: 40, planning_score: 38, ux_score: 80, data_score: 25 },
      metrics: { total_seconds: 3200, focused_seconds: 2700, distracted_seconds: 500, focus_ratio: 0.84, harness_error_count: 12, paste_ratio: 0.20, autonomy_score: 0.80 },
      ai_comment: "UX 관련 질문이 압도적으로 많습니다. 에러 12회로 시도 횟수는 높지만 집중도가 하락 중입니다.",
    },
    {
      session_id: "s2-2", timestamp_start: "2026-04-06T10:00:00Z",
      session_aptitude: { logic_score: 35, planning_score: 40, ux_score: 72, data_score: 27 },
      metrics: { total_seconds: 2800, focused_seconds: 2100, distracted_seconds: 700, focus_ratio: 0.75, harness_error_count: 15, paste_ratio: 0.22, autonomy_score: 0.78 },
      ai_comment: "집중도 75%로 하락. 에러 횟수 증가 → 난이도로 인한 어려움 감지. 멘토 개입 권장.",
    },
    {
      session_id: "s2-3", timestamp_start: "2026-04-08T10:00:00Z",
      session_aptitude: { logic_score: 30, planning_score: 44, ux_score: 70, data_score: 32 },
      metrics: { total_seconds: 2500, focused_seconds: 1700, distracted_seconds: 800, focus_ratio: 0.68, harness_error_count: 18, paste_ratio: 0.25, autonomy_score: 0.75 },
      ai_comment: "⚠️ RED_FLAG (MID): DIFFICULTY 원인으로 멘토 알림 발송됨. 집중도 68%.",
    },
  ],
  u3: [
    {
      session_id: "s3-1", timestamp_start: "2026-04-01T11:00:00Z",
      session_aptitude: { logic_score: 60, planning_score: 25, ux_score: 30, data_score: 78 },
      metrics: { total_seconds: 3900, focused_seconds: 3500, distracted_seconds: 400, focus_ratio: 0.90, harness_error_count: 4, paste_ratio: 0.05, autonomy_score: 0.95 },
      ai_comment: "집중도 90%, 자립도 95%로 최상위권. 데이터 분석 관련 질문이 집중됩니다.",
    },
    {
      session_id: "s3-2", timestamp_start: "2026-04-05T11:00:00Z",
      session_aptitude: { logic_score: 68, planning_score: 30, ux_score: 35, data_score: 84 },
      metrics: { total_seconds: 4200, focused_seconds: 3900, distracted_seconds: 300, focus_ratio: 0.93, harness_error_count: 5, paste_ratio: 0.04, autonomy_score: 0.96 },
      ai_comment: "#Data #Logic 태그 강화. 뛰어난 자립도와 집중도.",
    },
  ],
  u4: [
    {
      session_id: "s4-1", timestamp_start: "2026-04-03T14:00:00Z",
      session_aptitude: { logic_score: 22, planning_score: 28, ux_score: 20, data_score: 18 },
      metrics: { total_seconds: 2400, focused_seconds: 1700, distracted_seconds: 700, focus_ratio: 0.71, harness_error_count: 3, paste_ratio: 0.40, autonomy_score: 0.60 },
      ai_comment: "집중도 71%, 붙여넣기 비율 40%로 외부 코드 의존도가 높습니다.",
    },
    {
      session_id: "s4-2", timestamp_start: "2026-04-06T14:00:00Z",
      session_aptitude: { logic_score: 18, planning_score: 20, ux_score: 17, data_score: 14 },
      metrics: { total_seconds: 2000, focused_seconds: 1200, distracted_seconds: 800, focus_ratio: 0.60, harness_error_count: 2, paste_ratio: 0.50, autonomy_score: 0.50 },
      ai_comment: "집중도 60%로 하락. 시도 횟수도 줄어들고 있습니다.",
    },
    {
      session_id: "s4-3", timestamp_start: "2026-04-08T14:00:00Z",
      session_aptitude: { logic_score: 14, planning_score: 18, ux_score: 20, data_score: 13 },
      metrics: { total_seconds: 1500, focused_seconds: 750, distracted_seconds: 750, focus_ratio: 0.50, harness_error_count: 1, paste_ratio: 0.60, autonomy_score: 0.40 },
      ai_comment: "⚠️ RED_FLAG (HIGH): DISENGAGEMENT 원인. 접속 시간 50% 감소, 시도 횟수 최저. 즉각 면담 필요.",
    },
  ],
  u5: [
    {
      session_id: "s5-1", timestamp_start: "2026-04-04T09:00:00Z",
      session_aptitude: { logic_score: 40, planning_score: 72, ux_score: 35, data_score: 28 },
      metrics: { total_seconds: 3300, focused_seconds: 2800, distracted_seconds: 500, focus_ratio: 0.85, harness_error_count: 5, paste_ratio: 0.15, autonomy_score: 0.85 },
      ai_comment: "기획 질문 비중이 높고 집중도 85%로 양호합니다.",
    },
    {
      session_id: "s5-2", timestamp_start: "2026-04-08T09:00:00Z",
      session_aptitude: { logic_score: 44, planning_score: 66, ux_score: 41, data_score: 32 },
      metrics: { total_seconds: 3500, focused_seconds: 3000, distracted_seconds: 500, focus_ratio: 0.86, harness_error_count: 6, paste_ratio: 0.12, autonomy_score: 0.88 },
      ai_comment: "#Planning 태그 부여. 서비스 흐름 설계 질문이 꾸준히 높습니다.",
    },
  ],
  u6: [
    {
      session_id: "s6-1", timestamp_start: "2026-04-05T13:00:00Z",
      session_aptitude: { logic_score: 25, planning_score: 60, ux_score: 85, data_score: 18 },
      metrics: { total_seconds: 3600, focused_seconds: 3100, distracted_seconds: 500, focus_ratio: 0.86, harness_error_count: 3, paste_ratio: 0.18, autonomy_score: 0.82 },
      ai_comment: "UX와 기획 질문이 압도적. #UX #Planning 잠재 태그 감지.",
    },
    {
      session_id: "s6-2", timestamp_start: "2026-04-08T13:00:00Z",
      session_aptitude: { logic_score: 31, planning_score: 56, ux_score: 79, data_score: 24 },
      metrics: { total_seconds: 3400, focused_seconds: 2900, distracted_seconds: 500, focus_ratio: 0.85, harness_error_count: 4, paste_ratio: 0.20, autonomy_score: 0.80 },
      ai_comment: "#UX #Planning 태그 부여. 디자인 시스템 관련 질문 지속.",
    },
  ],
};

// ── 유틸 ─────────────────────────────────────────────────────────────────

export function getDemoStudent(userId: string): StudentSummary | undefined {
  return DEMO_STUDENTS.find((s) => s.user_id === userId);
}

export function getDemoProfile(userId: string): UserProfile | undefined {
  const s = getDemoStudent(userId);
  if (!s) return undefined;
  return {
    user_id: s.user_id,
    cumulative_aptitude: s.aptitude,
    session_count: s.session_count,
    career_identity: s.career_identity,
    last_updated: s.last_updated,
  };
}

export function getDemoSessions(userId: string): Session[] {
  return DEMO_SESSIONS[userId] ?? [];
}
