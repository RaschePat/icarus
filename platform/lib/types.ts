// ── 인증 / 역할 ───────────────────────────────────────────────────────────

export type UserRole = "student" | "instructor" | "admin" | "mentor";

export interface AuthUser {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  access_token: string;
}

// ── 과정 / 단원 ───────────────────────────────────────────────────────────

export interface Course {
  id: number;
  title: string;
  description: string;
  duration_months: number;
}

export interface Unit {
  id: number;
  course_id: number;
  title: string;
  order_index: number;
}

// ── lesson_context.json 스키마 ────────────────────────────────────────────

export interface InstructorStyle {
  language: string;
  naming_convention: string;
  comment_style: string;
  preferred_libraries: string[];
}

export interface CoreConcept {
  id: string;
  title: string;
  summary: string;
}

export interface KnowledgeBase {
  keywords: string[];
  core_concepts: CoreConcept[];
}

export interface TargetLogic {
  logic_id: string;
  search_pattern: string;
  code_snippet: string;
  match_strategy: "first_occurrence" | "all_occurrences";
}

export interface QuizItem {
  id: string;
  question: string;
  options: string[];
  answer_index: number;
}

export interface HarnessConfig {
  target_logic: TargetLogic[];
  quiz_pool: QuizItem[];
  quiz_active?: boolean;
}

export interface LessonContext {
  lesson_id: string;
  metadata: {
    topic: string;
    instructor_id: string;
    timestamp: string;
    instructor_style: InstructorStyle;
  };
  knowledge_base: KnowledgeBase;
  harness_config: HarnessConfig;
}

// ── 마이크로 프로젝트 ─────────────────────────────────────────────────────

export type ProjectTemplate = "java" | "python" | "node";

export interface MicroProject {
  id: number;
  project_id?: string; // 호환성
  user_id: string;
  session_id: string;
  name: string;
  template: ProjectTemplate;
  interest_category: string;
  harness_total: number;
  harness_filled: number;
  created_at: string;
}

// ── 알림 ─────────────────────────────────────────────────────────────────

export interface Notification {
  id: number;
  user_id: string;
  type: "RED_FLAG" | "INFO" | "QUIZ";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ── 적성 / 대시보드 ───────────────────────────────────────────────────────

export interface AptitudeScores {
  logic_avg: number;
  planning_avg: number;
  ux_avg: number;
  data_avg: number;
}

export interface InterestProfile {
  category_counts: Record<string, number>;
  top_category: string | null;
  keyword_freq: Record<string, number>;
  top_keywords: string[];
}

export interface UserProfile {
  user_id: string;
  cumulative_aptitude: AptitudeScores;
  session_count: number;
  career_identity: string[];
  interest_profile?: InterestProfile;
  last_updated: string;
}

export interface SessionAptitude {
  logic_score: number;
  planning_score: number;
  ux_score: number;
  data_score: number;
}

export interface SessionMetrics {
  focused_seconds: number;
  total_seconds: number;
  distracted_seconds: number;
  focus_ratio: number;
  harness_error_count: number;
  autonomy_score: number;
  paste_ratio: number;
}

export interface Session {
  session_id: string;
  user_id: string;
  timestamp_start: string;
  session_aptitude: SessionAptitude;
  metrics?: SessionMetrics;
  ai_comment?: string;
}

// ── 학생 현황 (학급 뷰) ───────────────────────────────────────────────────

export interface StudentStatus {
  user_id: string;
  name: string;
  progress: number;
  hint_level: 0 | 1 | 2 | 3;
  is_red_flag: boolean;
  last_active: string;
}

export interface RedFlag {
  user_id: string;
  name: string;
  severity: "HIGH" | "MID";
  reason: string;
  cause: "DIFFICULTY" | "DISENGAGEMENT";
  detected_at: string;
}

export interface StudentSummary {
  user_id: string;
  name: string;
  aptitude: AptitudeScores;
  session_count: number;
  career_identity: string[];
  last_updated: string;
  red_flag?: RedFlag;
}

// ── STT 분석 결과 ─────────────────────────────────────────────────────────

export interface AnalysisResult {
  topic: string;
  keywords: string[];
  core_concepts: { title: string; summary: string }[];
}
