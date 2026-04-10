"use client";

import { useState } from "react";
import type { LessonContext } from "@/lib/types";

interface Props {
  lesson:   LessonContext;
  onChange: (updated: LessonContext) => void;
}

export default function CurriculumPanel({ lesson, onChange }: Props) {
  const [conceptInput, setConceptInput] = useState("");
  const [libraryInput, setLibraryInput] = useState("");

  const topic     = lesson.metadata.topic;
  const concepts  = lesson.knowledge_base.keywords;
  const libraries = lesson.metadata.instructor_style.preferred_libraries;

  // ── 수업 주제 ──────────────────────────────────────────────────────────────
  const setTopic = (value: string) =>
    onChange({ ...lesson, metadata: { ...lesson.metadata, topic: value } });

  // ── 핵심 개념 ──────────────────────────────────────────────────────────────
  const addConcept = () => {
    const val = conceptInput.trim();
    if (!val || concepts.includes(val)) return;
    onChange({
      ...lesson,
      knowledge_base: { ...lesson.knowledge_base, keywords: [...concepts, val] },
    });
    setConceptInput("");
  };

  const removeConcept = (i: number) =>
    onChange({
      ...lesson,
      knowledge_base: {
        ...lesson.knowledge_base,
        keywords: concepts.filter((_, j) => j !== i),
      },
    });

  // ── 라이브러리 / API ────────────────────────────────────────────────────────
  const addLibrary = () => {
    const val = libraryInput.trim();
    if (!val || libraries.includes(val)) return;
    onChange({
      ...lesson,
      metadata: {
        ...lesson.metadata,
        instructor_style: {
          ...lesson.metadata.instructor_style,
          preferred_libraries: [...libraries, val],
        },
      },
    });
    setLibraryInput("");
  };

  const removeLibrary = (i: number) =>
    onChange({
      ...lesson,
      metadata: {
        ...lesson.metadata,
        instructor_style: {
          ...lesson.metadata.instructor_style,
          preferred_libraries: libraries.filter((_, j) => j !== i),
        },
      },
    });

  return (
    <div className="card flex flex-col gap-4">
      <h2 className="font-semibold text-sm">📋 수업 계획표</h2>

      {/* 수업 주제 */}
      <div>
        <label className="label">수업 주제</label>
        <input
          className="input text-sm"
          placeholder="예: Java Collections Framework"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
      </div>

      {/* 핵심 개념 목록 */}
      <div>
        <label className="label">핵심 개념 목록</label>
        {concepts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {concepts.map((c, i) => (
              <span
                key={i}
                className="badge bg-blue-900/40 text-blue-300 text-xs cursor-pointer hover:bg-red-900/40 hover:text-red-300 transition-colors"
                title="클릭하여 삭제"
                onClick={() => removeConcept(i)}
              >
                {c} ✕
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            className="input text-sm flex-1"
            placeholder="개념 입력 후 Enter"
            value={conceptInput}
            onChange={(e) => setConceptInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addConcept()}
          />
          <button className="btn-primary text-sm px-3 shrink-0" onClick={addConcept}>
            추가
          </button>
        </div>
      </div>

      {/* 라이브러리 / API */}
      <div>
        <label className="label">라이브러리 / API</label>
        {libraries.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {libraries.map((l, i) => (
              <span
                key={i}
                className="badge bg-violet-900/40 text-violet-300 text-xs cursor-pointer hover:bg-red-900/40 hover:text-red-300 transition-colors"
                title="클릭하여 삭제"
                onClick={() => removeLibrary(i)}
              >
                {l} ✕
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            className="input text-sm flex-1"
            placeholder="예: java.util.Collections, Stream API"
            value={libraryInput}
            onChange={(e) => setLibraryInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addLibrary()}
          />
          <button className="btn-primary text-sm px-3 shrink-0" onClick={addLibrary}>
            추가
          </button>
        </div>
      </div>

      <p className="text-slate-600 text-xs">
        수업 시작 전에 등록한 계획표는 STT 분석 시 Claude 프롬프트에 포함되어 사담 판별 정확도를 높입니다.
      </p>
    </div>
  );
}
