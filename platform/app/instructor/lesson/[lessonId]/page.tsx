"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";
import SttPanel from "@/components/instructor/SttPanel";
import KnowledgeCardEditor from "@/components/instructor/KnowledgeCardEditor";
import DeployButton from "@/components/instructor/DeployButton";
import CurriculumPanel from "@/components/instructor/CurriculumPanel";
import { activateQuiz } from "@/lib/api";
import type { LessonContext, AnalysisResult } from "@/lib/types";

function makeLesson(lessonId: string, instructorId: string): LessonContext {
  return {
    lesson_id: lessonId,
    metadata: {
      topic: "",
      instructor_id: instructorId,
      timestamp: new Date().toISOString(),
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

export default function LessonConsolePage() {
  const { lessonId } = useParams() as { lessonId: string };
  const router = useRouter();
  const { data: session } = useSession();
  const userId = (session?.user as { user_id?: string })?.user_id ?? "instructor-001";

  const [lesson, setLesson] = useState<LessonContext>(() => makeLesson(lessonId, userId));
  const [quizActivating, setQuizActivating] = useState(false);
  const [quizMsg, setQuizMsg] = useState("");

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

  const handleActivateQuiz = async () => {
    setQuizActivating(true);
    setQuizMsg("");
    try {
      await activateQuiz(lessonId);
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
          <button
            onClick={() => router.push("/instructor")}
            className="text-slate-400 hover:text-slate-200 text-sm transition-colors"
          >
            ← 강의 목록으로
          </button>
          <h1 className="text-lg font-bold mt-1">강의 콘솔</h1>
          <p className="text-slate-500 text-xs font-mono mt-0.5">{lessonId}</p>
        </div>
        <div className="flex gap-2">
          <button
            className={`text-sm px-4 py-2 rounded-lg font-semibold transition-colors ${
              quizActivating
                ? "bg-yellow-700 text-yellow-200 cursor-wait"
                : "bg-yellow-600 hover:bg-yellow-500 text-white"
            }`}
            onClick={handleActivateQuiz}
            disabled={quizActivating}
          >
            {quizActivating ? "활성화 중…" : "🎯 퀴즈 시작"}
          </button>
        </div>
      </div>

      {quizMsg && (
        <p className={`text-xs px-3 py-2 rounded-lg ${
          quizMsg.startsWith("오류")
            ? "bg-red-950/30 text-red-300 border border-red-500/30"
            : "bg-emerald-950/30 text-emerald-300 border border-emerald-500/30"
        }`}>
          {quizMsg}
        </p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        <div className="flex flex-col gap-6">
          <SttPanel
            onAnalysisComplete={handleAnalysisComplete}
            lessonTopic={lesson.metadata.topic}
            lessonKeywords={lesson.knowledge_base.keywords}
            lessonLibraries={lesson.metadata.instructor_style.preferred_libraries}
          />
          <KnowledgeCardEditor lesson={lesson} onChange={setLesson} />
        </div>
        <div className="flex flex-col gap-6">
          <CurriculumPanel lesson={lesson} onChange={setLesson} />
          <DeployButton lesson={lesson} />
          <JsonPreview lesson={lesson} />
        </div>
      </div>
    </div>
  );
}
