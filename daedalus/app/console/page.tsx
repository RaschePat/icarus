"use client";

import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import SttPanel from "@/components/SttPanel";
import KnowledgeCardEditor from "@/components/KnowledgeCardEditor";
import DeployButton from "@/components/DeployButton";
import ClassOverview from "@/components/ClassOverview";
import type { LessonContext, StudentStatus } from "@/lib/types";
import type { AnalysisResult } from "@/app/api/classify-segment/route";

// ── lesson_id / timestamp 없는 빈 템플릿 (SSR-safe) ─────────────────────────
function makeBlankLesson(): LessonContext {
  return {
    lesson_id: "",
    metadata: {
      topic: "",
      instructor_id: "instructor-001",
      timestamp: "",
      instructor_style: {
        language: "java",
        naming_convention: "camelCase",
        comment_style: "Korean",
        preferred_libraries: [],
      },
    },
    knowledge_base: {
      keywords: [],
      core_concepts: [],
    },
    harness_config: {
      target_logic: [],
      quiz_pool: [],
    },
  };
}

// 클라이언트 전용 ID/타임스탬프를 채운 새 수업 객체 생성
function makeFreshLesson(): LessonContext {
  const blank = makeBlankLesson();
  return {
    ...blank,
    lesson_id: `lesson-${uuidv4().slice(0, 8)}`,
    metadata: { ...blank.metadata, timestamp: new Date().toISOString() },
  };
}

// ── 데모용 학생 데이터 ──────────────────────────────────────────────────────
const DEMO_STUDENTS: StudentStatus[] = [
  { user_id: "u1", name: "김지수", progress: 85, hint_level: 0, is_red_flag: false, last_active: "14:32:10" },
  { user_id: "u2", name: "이현우", progress: 42, hint_level: 2, is_red_flag: false, last_active: "14:28:05" },
  { user_id: "u3", name: "박소연", progress: 100, hint_level: 0, is_red_flag: false, last_active: "14:35:01" },
  { user_id: "u4", name: "최민준", progress: 15, hint_level: 1, is_red_flag: true,  last_active: "14:10:44" },
  { user_id: "u5", name: "정다은", progress: 67, hint_level: 1, is_red_flag: false, last_active: "14:33:58" },
  { user_id: "u6", name: "강태양", progress: 8,  hint_level: 3, is_red_flag: true,  last_active: "13:55:20" },
];

export default function ConsolePage() {
  // SSR에서는 빈 값으로 초기화 → useEffect에서 클라이언트 전용 UUID/타임스탬프 주입
  const [lesson, setLesson] = useState<LessonContext>(makeBlankLesson);

  useEffect(() => {
    setLesson((prev) => ({
      ...prev,
      lesson_id: `lesson-${uuidv4().slice(0, 8)}`,
      metadata: { ...prev.metadata, timestamp: new Date().toISOString() },
    }));
  }, []);

  // STT 분석 완료 → lesson 지식 카드 자동 채우기
  const handleAnalysisComplete = useCallback((result: AnalysisResult) => {
    setLesson((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        // 주제가 비어있을 때만 덮어씀 (강사가 직접 입력한 경우 보존)
        topic: prev.metadata.topic || result.topic,
      },
      knowledge_base: {
        // 기존 키워드에 새 키워드 병합 (중복 제거)
        keywords: Array.from(new Set([...prev.knowledge_base.keywords, ...result.keywords])),
        // 기존 개념 카드에 추가 (id는 클라이언트에서 생성)
        core_concepts: [
          ...prev.knowledge_base.core_concepts,
          ...result.core_concepts.map((c) => ({
            id:      uuidv4(),
            title:   c.title,
            summary: c.summary,
          })),
        ],
      },
    }));
  }, []);

  // newLesson은 클릭 핸들러이므로 makeFreshLesson() 직접 호출 가능 (SSR 미실행)
  const newLesson = () => {
    if (confirm("현재 편집 내용이 초기화됩니다. 계속하시겠습니까?")) {
      setLesson(makeFreshLesson());
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col gap-6">

      {/* 상단 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">강의 콘솔</h1>
          <p className="text-slate-400 text-sm mt-0.5" suppressHydrationWarning>
            수업 중 STT로 텍스트를 받아적고, 수업 종료 후 &apos;수업 분석&apos;으로 지식 카드를 자동 생성하세요.
          </p>
        </div>
        <button className="btn-ghost text-sm" onClick={newLesson}>
          + 새 수업
        </button>
      </div>

      {/* 메인 2열 레이아웃 */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">

        {/* 왼쪽: STT + 지식 카드 편집기 */}
        <div className="flex flex-col gap-6">
          <SttPanel
            onAnalysisComplete={handleAnalysisComplete}
            lessonTopic={lesson.metadata.topic}
            lessonKeywords={lesson.knowledge_base.keywords}
          />
          <KnowledgeCardEditor lesson={lesson} onChange={setLesson} />
        </div>

        {/* 오른쪽: 배포 버튼 + JSON 미리보기 */}
        <div className="flex flex-col gap-6">
          <DeployButton lesson={lesson} />
          <JsonPreview lesson={lesson} />
        </div>
      </div>

      {/* 하단: 학급 이해도 현황판 */}
      <ClassOverview students={DEMO_STUDENTS} />
    </div>
  );
}

// JSON 미리보기 토글 컴포넌트
function JsonPreview({ lesson }: { lesson: LessonContext }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <button
        className="w-full flex items-center justify-between text-sm font-medium text-slate-300 hover:text-slate-100"
        onClick={() => setOpen((o) => !o)}
      >
        <span>JSON 미리보기</span>
        <span className="text-slate-500">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <pre className="mt-3 text-xs font-mono text-slate-400 bg-slate-950 rounded-lg p-3 overflow-auto max-h-80">
          {JSON.stringify(lesson, null, 2)}
        </pre>
      )}
    </div>
  );
}
