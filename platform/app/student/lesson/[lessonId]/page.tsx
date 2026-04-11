"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

interface LessonData {
  lesson_id: string;
  metadata?: {
    topic?: string;
    instructor_id?: string;
  };
  knowledge_base?: {
    keywords?: string[];
    core_concepts?: Array<{ title: string; summary: string }>;
  };
}

interface SectionInfo {
  lesson_id: string;
  unit_id: number | null;
  section_title: string;
  section_order: number;
}

export default function StudentLessonPage() {
  const { lessonId } = useParams() as { lessonId: string };
  const { data: session } = useSession();
  const userId = (session?.user as { user_id?: string })?.user_id ?? "";

  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [section, setSection] = useState<SectionInfo | null>(null);
  const [instructor, setInstructor] = useState<string>("");
  const [unitTitle, setUnitTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 수업 정보 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        // 수업 정보 로드
        const lessonRes = await fetch(`/api/v1/lesson/${lessonId}`);
        if (lessonRes.ok) {
          const lessonData = await lessonRes.json();
          setLesson(lessonData);

          // 강사 이름 로드 (선택사항)
          if (lessonData.metadata?.instructor_id) {
            try {
              const instructorRes = await fetch(`/api/v1/user/profile/${lessonData.metadata.instructor_id}`);
              if (instructorRes.ok) {
                const instructorData = await instructorRes.json();
                setInstructor(instructorData.name || lessonData.metadata.instructor_id);
              }
            } catch {
              setInstructor(lessonData.metadata.instructor_id);
            }
          }
        }
      } catch (e) {
        setError(`수업 정보 로드 실패: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [lessonId]);

  if (loading) {
    return (
      <div className="max-w-screen-lg mx-auto px-6 py-6 flex items-center justify-center min-h-[400px]">
        <p className="text-slate-400 animate-pulse">수업 정보를 불러오는 중…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-screen-lg mx-auto px-6 py-6">
        <p className="text-red-400 text-sm bg-red-950/30 border border-red-500/30 rounded-lg px-3 py-2">
          ⚠ {error}
        </p>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="max-w-screen-lg mx-auto px-6 py-6">
        <p className="text-slate-400 text-sm">수업 정보를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const keywords = lesson.knowledge_base?.keywords || [];
  const concepts = lesson.knowledge_base?.core_concepts || [];

  return (
    <div className="max-w-screen-lg mx-auto px-6 py-6 flex flex-col gap-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl font-bold">수업</h1>
        <p className="text-slate-400 text-sm mt-0.5">Wing 확장프로그램과 함께 수업 영상을 진행하세요.</p>
      </div>

      {/* Wing 설치 안내 */}
      <div className="card bg-blue-950/30 border border-blue-500/30 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-sm text-blue-200">🚀 Wing 확장프로그램 설치</h2>
            <p className="text-xs text-blue-300 mt-1">
              Wing 확장프로그램을 설치하면 수업 영상과 함께 실시간으로 퀴즈, 코드 등을 화면에 표시합니다.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <a
            href="https://chromewebstore.google.com/detail/wing"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm w-full text-center"
          >
            Chrome 웹 스토어에서 설치
          </a>

          {/* 설정값 */}
          <div className="bg-slate-900/50 rounded-lg p-3 flex flex-col gap-2">
            <p className="text-xs text-slate-500">설치 후 Wing 확장프로그램 설정에서 다음을 입력하세요:</p>
            <div className="flex items-center justify-between gap-2 bg-slate-800/50 rounded px-2 py-1.5">
              <div className="flex-1">
                <p className="text-xs text-slate-500">Lesson ID</p>
                <p className="text-sm font-mono text-slate-200">{lessonId}</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(lessonId);
                  alert("복사되었습니다!");
                }}
                className="btn-ghost text-xs px-2 shrink-0"
              >
                복사
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 수업 정보 */}
      <div className="card flex flex-col gap-3">
        <h2 className="font-semibold text-sm">수업 정보</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-slate-800/40 rounded-lg px-3 py-2">
            <p className="text-xs text-slate-500">주제</p>
            <p className="text-sm font-medium text-slate-200">
              {lesson.metadata?.topic || "주제 미정"}
            </p>
          </div>

          {instructor && (
            <div className="bg-slate-800/40 rounded-lg px-3 py-2">
              <p className="text-xs text-slate-500">강사</p>
              <p className="text-sm font-medium text-slate-200">{instructor}</p>
            </div>
          )}
        </div>
      </div>

      {/* 키워드 */}
      {keywords.length > 0 && (
        <div className="card flex flex-col gap-3">
          <h2 className="font-semibold text-sm">오늘 수업 키워드</h2>
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <span key={keyword} className="badge bg-blue-900/40 text-blue-300 text-sm">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 핵심 개념 */}
      {concepts.length > 0 && (
        <div className="card flex flex-col gap-3">
          <h2 className="font-semibold text-sm">핵심 개념</h2>
          <div className="flex flex-col gap-2">
            {concepts.map((concept, idx) => (
              <div key={idx} className="bg-slate-800/40 rounded-lg px-3 py-2.5">
                <p className="text-sm font-medium text-slate-200">{idx + 1}. {concept.title}</p>
                {concept.summary && (
                  <p className="text-xs text-slate-400 mt-1">{concept.summary}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 기본 안내 */}
      {keywords.length === 0 && concepts.length === 0 && (
        <div className="card text-center py-8">
          <p className="text-slate-400 text-sm">강사가 아직 수업 정보를 준비하지 않았습니다.</p>
          <p className="text-slate-600 text-xs mt-1">수업 시간에 강사가 강의를 기록하면 키워드와 핵심 개념이 표시됩니다.</p>
        </div>
      )}
    </div>
  );
}
