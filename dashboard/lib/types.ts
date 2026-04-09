// ── 적성 점수 ────────────────────────────────────────────────────────────

export interface AptitudeScores {
  logic_avg:    number;  // 0–100
  planning_avg: number;
  ux_avg:       number;
  data_avg:     number;
}

export interface RadarPoint {
  subject: string;
  score:   number;
  fullMark: number;
}

// ── 사용자 프로필 ─────────────────────────────────────────────────────────

export interface UserProfile {
  user_id:            string;
  cumulative_aptitude: AptitudeScores;
  session_count:      number;
  career_identity:    string[];   // e.g. ["#Logic", "#Planning"]
  last_updated:       string;     // ISO 8601
}

// ── 세션 ─────────────────────────────────────────────────────────────────

export interface SessionAptitude {
  logic_score:    number;
  planning_score: number;
  ux_score:       number;
  data_score:     number;
}

export interface SessionMetrics {
  total_seconds:        number;
  focused_seconds:      number;
  distracted_seconds:   number;
  focus_ratio:          number;
  harness_error_count:  number;
  paste_ratio:          number;
  autonomy_score:       number;
}

export interface Session {
  session_id:       string;
  timestamp_start:  string;
  session_aptitude: SessionAptitude;
  metrics?:         SessionMetrics;
  ai_comment?:      string;
}

// ── RED FLAG ──────────────────────────────────────────────────────────────

export type Severity = "HIGH" | "MID";
export type Cause    = "DIFFICULTY" | "DISENGAGEMENT";

export interface RedFlag {
  user_id:  string;
  name:     string;
  severity: Severity;
  cause:    Cause;
  reason:   string;
  detected_at: string;
}

// ── 학생 요약 (대시보드 목록용) ────────────────────────────────────────────

export interface StudentSummary {
  user_id:         string;
  name:            string;
  session_count:   number;
  career_identity: string[];
  aptitude:        AptitudeScores;
  red_flag?:       Pick<RedFlag, "severity" | "cause">;
  last_updated:    string;
}
