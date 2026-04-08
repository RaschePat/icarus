// ─── lesson_context.json 스키마 ───────────────────────────────────────────

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

export interface HarnessConfig {
  target_logic: TargetLogic[];
  quiz_pool: QuizItem[];
}

export interface QuizItem {
  id: string;
  question: string;
  options: string[];
  answer_index: number;
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

// ─── STT 세그먼트 ─────────────────────────────────────────────────────────

export type SttSegmentStatus = "pending" | "approved" | "rejected";

export interface SttSegment {
  id: string;
  text: string;
  timestamp: string;
  status: SttSegmentStatus;
  isFinal: boolean;
}

// ─── 학급 현황 ────────────────────────────────────────────────────────────

export interface StudentStatus {
  user_id: string;
  name: string;
  progress: number;       // 0–100
  hint_level: 0 | 1 | 2 | 3;
  is_red_flag: boolean;
  last_active: string;
}
