"use client";

import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useSession } from "next-auth/react";
import SttPanel from "@/components/instructor/SttPanel";
import KnowledgeCardEditor from "@/components/instructor/KnowledgeCardEditor";
import DeployButton from "@/components/instructor/DeployButton";
import CurriculumPanel from "@/components/instructor/CurriculumPanel";
import ClassOverview from "@/components/instructor/ClassOverview";
import { activateQuiz } from "@/lib/api";
import type { LessonContext, AnalysisResult } from "@/lib/types";

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
    knowledge_base: { keywords: [], core_concepts: [] },
    harness_config: { target_logic: [], quiz_pool: [] },
  };
}

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

export default function InstructorConsolePage() {
  const { data: session } = useSession();
  const [lesson, setLesson] = useState<LessonContext>(makeBlankLesson);
  const [quizActivating, setQuizActivating] = useState(false);
  const [quizMsg, setQuizMsg] = useState("");

  useEffect(() => {
    setLesson((prev) => ({
      ...prev,
      lesson_id: `lesson-${uuidv4().slice(0, 8)}`,
      metadata: {
        ...prev.metadata,
        instructor_id: (session?.user as { user_id?: string })?.user_id ?? "instructor-001",
        timestamp: new Date().toISOString(),
      },
    }));
  }, [session]);

  const handleAnalysisComplete = useCallback((result: AnalysisResult) => {
    setLesson((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        topic: prev.metadata.topic || result.topic,
      },
      knowledge_base: {
        keywords: Array.from(new Set([...prev.knowledge_base.keywords, ...result.keywords])),
        core_concepts: [
          ...prev.knowledge_base.core_concepts,
          ...result.core_concepts.map((c) => ({ id: uuidv4(), title: c.title, summary: c.summary })),
        ],
      },
    }));
  }, []);

  const newLesson = () => {
    if (confirm("현재 편집 내용이 초기화됩니다. 계속하시겠습니까?")) {
      setLesson({
        ...makeBlankLesson(),
        lesson_id: `lesson-${uuidv4().slice(0, 8)}`,
        metadata: { ...makeBlankLesson().metadata, timestamp: new Date().toISOString() },
      });
    }
  };

  const handleActivateQuiz = async () => {
    if (!lesson.lesson_id) return;
    setQuizActivating(true);
    setQuizMsg("");
    try {
      await activateQuiz(lesson.lesson_id);
      setQuizMsg("퀴즈가 활성화되었습니다. Wing에서 자동으로 퀴즈 패널이 표시됩니다.");
    } catch (e) {
      setQuizMsg(`오류: ${(e as Error).message}`);
    } finally {
      setQuizActivating(false);
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">강의 콘솔</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            STT로 강의를 받아적고, 수업 종료 후 지식 카드를 자동 생성하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className={`text-sm px-4 py-2 rounded-lg font-semibold transition-colors ${
              quizActivating
                ? "bg-yellow-700 text-yellow-200 cursor-wait"
                : "bg-yellow-600 hover:bg-yellow-500 text-white"
            }`}
            onClick={handleActivateQuiz}
            disabled={quizActivating || !lesson.lesson_id}
            title="현재 레슨의 퀴즈를 활성화합니다"
          >
            {quizActivating ? "활성화 중…" : "🎯 퀴즈 시작"}
          </button>
          <button className="btn-ghost text-sm" onClick={newLesson}>
            + 새 수업
          </button>
        </div>
      </div>

      {quizMsg && (
        <p className={`text-xs px-3 py-2 rounded-lg ${
          quizMsg.startsWith("오류") ? "bg-red-950/30 text-red-300 border border-red-500/30" : "bg-emerald-950/30 text-emerald-300 border border-emerald-500/30"
        }`}>
          {quizMsg}
        </p>
      )}

      {/* 메인 2열 레이아웃 */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        {/* 왼쪽 */}
        <div className="flex flex-col gap-6">
          <SttPanel
            onAnalysisComplete={handleAnalysisComplete}
            lessonTopic={lesson.metadata.topic}
            lessonKeywords={lesson.knowledge_base.keywords}
            lessonLibraries={lesson.metadata.instructor_style.preferred_libraries}
          />
          <KnowledgeCardEditor lesson={lesson} onChange={setLesson} />
        </div>

        {/* 오른쪽 */}
        <div className="flex flex-col gap-6">
          <CurriculumPanel lesson={lesson} onChange={setLesson} />
          <DeployButton lesson={lesson} />
          <JsonPreview lesson={lesson} />
        </div>
      </div>

      {/* 하단: 실시간 학급 현황 */}
      <ClassOverview pollInterval={15_000} />
    </div>
  );
}
