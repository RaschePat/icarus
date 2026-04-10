"use client";

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type {
  LessonContext,
  CoreConcept,
  TargetLogic,
  InstructorStyle,
} from "@/lib/types";

interface Props {
  lesson: LessonContext;
  onChange: (updated: LessonContext) => void;
}

export default function KnowledgeCardEditor({ lesson, onChange }: Props) {
  const [activeTab, setActiveTab] = useState<"meta" | "knowledge" | "harness">("meta");

  // 다음에 추가될 항목의 ID를 useEffect에서 미리 생성 (SSR-safe)
  const [nextConceptId, setNextConceptId] = useState("");
  const [nextLogicId, setNextLogicId] = useState("");

  useEffect(() => {
    setNextConceptId(uuidv4());
    setNextLogicId(uuidv4());
  }, []);

  const update = (partial: Partial<LessonContext>) =>
    onChange({ ...lesson, ...partial });

  const updateMeta = (key: string, value: string) =>
    update({ metadata: { ...lesson.metadata, [key]: value } });

  const updateStyle = (key: keyof InstructorStyle, value: string | string[]) =>
    update({
      metadata: {
        ...lesson.metadata,
        instructor_style: { ...lesson.metadata.instructor_style, [key]: value },
      },
    });

  // ── 탭 공통 스타일 ──────────────────────────────────────────────────────
  const tab = (id: typeof activeTab) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
      activeTab === id
        ? "bg-slate-800 text-slate-100 border-b-2 border-blue-500"
        : "text-slate-400 hover:text-slate-200"
    }`;

  return (
    <div className="card flex flex-col gap-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm">📋 지식 카드 편집</h2>
        <span className="text-slate-500 text-xs font-mono">{lesson.lesson_id}</span>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-1 border-b border-slate-700 mb-4">
        <button className={tab("meta")}      onClick={() => setActiveTab("meta")}>기본 정보</button>
        <button className={tab("knowledge")} onClick={() => setActiveTab("knowledge")}>지식베이스</button>
        <button className={tab("harness")}   onClick={() => setActiveTab("harness")}>Harness</button>
      </div>

      {/* ── 탭 1: 기본 정보 ── */}
      {activeTab === "meta" && (
        <div className="flex flex-col gap-4">
          <Field label="수업 주제">
            <input
              className="input"
              value={lesson.metadata.topic}
              placeholder="예: Java Collections Framework"
              onChange={(e) => updateMeta("topic", e.target.value)}
            />
          </Field>
          <Field label="강사 ID">
            <input
              className="input"
              value={lesson.metadata.instructor_id}
              placeholder="instructor-001"
              onChange={(e) => updateMeta("instructor_id", e.target.value)}
            />
          </Field>

          <div className="border-t border-slate-700 pt-4">
            <p className="label mb-3">강사 스타일 (instructor_style)</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="언어">
                <select
                  className="input"
                  value={lesson.metadata.instructor_style.language}
                  onChange={(e) => updateStyle("language", e.target.value)}
                >
                  {["java", "python", "javascript", "typescript"].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="명명 규칙">
                <select
                  className="input"
                  value={lesson.metadata.instructor_style.naming_convention}
                  onChange={(e) => updateStyle("naming_convention", e.target.value)}
                >
                  {["camelCase", "snake_case", "PascalCase", "kebab-case"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="주석 스타일">
                <select
                  className="input"
                  value={lesson.metadata.instructor_style.comment_style}
                  onChange={(e) => updateStyle("comment_style", e.target.value)}
                >
                  {["Korean", "English", "Korean+English"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="선호 라이브러리 (쉼표 구분)">
                <input
                  className="input"
                  value={lesson.metadata.instructor_style.preferred_libraries.join(", ")}
                  placeholder="java.util.Collections, java.util.List"
                  onChange={(e) =>
                    updateStyle(
                      "preferred_libraries",
                      e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                    )
                  }
                />
              </Field>
            </div>
          </div>
        </div>
      )}

      {/* ── 탭 2: 지식베이스 ── */}
      {activeTab === "knowledge" && (
        <div className="flex flex-col gap-5">
          {/* 키워드 */}
          <div>
            <label className="label">핵심 키워드</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {lesson.knowledge_base.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="badge bg-blue-900/40 text-blue-300 cursor-pointer hover:bg-red-900/40 hover:text-red-300 transition-colors"
                  title="클릭하여 삭제"
                  onClick={() =>
                    update({
                      knowledge_base: {
                        ...lesson.knowledge_base,
                        keywords: lesson.knowledge_base.keywords.filter((_, j) => j !== i),
                      },
                    })
                  }
                >
                  {kw} ✕
                </span>
              ))}
            </div>
            <AddItemInput
              placeholder="키워드 입력 후 Enter"
              onAdd={(val) =>
                update({
                  knowledge_base: {
                    ...lesson.knowledge_base,
                    keywords: [...lesson.knowledge_base.keywords, val],
                  },
                })
              }
            />
          </div>

          {/* 핵심 개념 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label">핵심 개념 카드</label>
              <button
                className="btn-ghost text-xs"
                onClick={() => {
                  update({
                    knowledge_base: {
                      ...lesson.knowledge_base,
                      core_concepts: [
                        ...lesson.knowledge_base.core_concepts,
                        { id: nextConceptId, title: "", summary: "" },
                      ],
                    },
                  });
                  setNextConceptId(uuidv4()); // 다음 추가를 위한 ID 갱신
                }}
              >
                + 추가
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {lesson.knowledge_base.core_concepts.map((cc, i) => (
                <ConceptCard
                  key={cc.id}
                  concept={cc}
                  onUpdate={(updated) => {
                    const concepts = [...lesson.knowledge_base.core_concepts];
                    concepts[i] = updated;
                    update({ knowledge_base: { ...lesson.knowledge_base, core_concepts: concepts } });
                  }}
                  onDelete={() => {
                    update({
                      knowledge_base: {
                        ...lesson.knowledge_base,
                        core_concepts: lesson.knowledge_base.core_concepts.filter((_, j) => j !== i),
                      },
                    });
                  }}
                />
              ))}
              {lesson.knowledge_base.core_concepts.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">개념 카드가 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 탭 3: Harness 설정 ── */}
      {activeTab === "harness" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <label className="label">빈칸 주입 로직 (target_logic)</label>
            <button
              className="btn-ghost text-xs"
              onClick={() => {
                update({
                  harness_config: {
                    ...lesson.harness_config,
                    target_logic: [
                      ...lesson.harness_config.target_logic,
                      {
                        logic_id: nextLogicId,
                        search_pattern: "",
                        code_snippet: "",
                        match_strategy: "first_occurrence",
                      },
                    ],
                  },
                });
                setNextLogicId(uuidv4()); // 다음 추가를 위한 ID 갱신
              }}
            >
              + 추가
            </button>
          </div>

          {lesson.harness_config.target_logic.map((tl, i) => (
            <TargetLogicCard
              key={tl.logic_id}
              logic={tl}
              onUpdate={(updated) => {
                const list = [...lesson.harness_config.target_logic];
                list[i] = updated;
                update({ harness_config: { ...lesson.harness_config, target_logic: list } });
              }}
              onDelete={() => {
                update({
                  harness_config: {
                    ...lesson.harness_config,
                    target_logic: lesson.harness_config.target_logic.filter((_, j) => j !== i),
                  },
                });
              }}
            />
          ))}
          {lesson.harness_config.target_logic.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-4">
              설정된 Harness 로직이 없습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── 서브 컴포넌트 ──────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function AddItemInput({ placeholder, onAdd }: { placeholder: string; onAdd: (v: string) => void }) {
  const [val, setVal] = useState("");
  const submit = () => {
    if (!val.trim()) return;
    onAdd(val.trim());
    setVal("");
  };
  return (
    <div className="flex gap-2">
      <input
        className="input text-sm"
        value={val}
        placeholder={placeholder}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <button className="btn-primary text-sm px-3 shrink-0" onClick={submit}>추가</button>
    </div>
  );
}

function ConceptCard({
  concept,
  onUpdate,
  onDelete,
}: {
  concept: CoreConcept;
  onUpdate: (c: CoreConcept) => void;
  onDelete: () => void;
}) {
  return (
    <div className="border border-slate-700 rounded-lg p-3 flex flex-col gap-2 bg-slate-800/30">
      <div className="flex gap-2 items-center">
        <input
          className="input text-sm font-semibold flex-1"
          placeholder="개념 제목"
          value={concept.title}
          onChange={(e) => onUpdate({ ...concept, title: e.target.value })}
        />
        <button className="btn-danger py-1 px-2 text-xs" onClick={onDelete}>삭제</button>
      </div>
      <textarea
        className="input text-sm resize-none"
        rows={2}
        placeholder="개념 요약"
        value={concept.summary}
        onChange={(e) => onUpdate({ ...concept, summary: e.target.value })}
      />
    </div>
  );
}

function TargetLogicCard({
  logic,
  onUpdate,
  onDelete,
}: {
  logic: TargetLogic;
  onUpdate: (l: TargetLogic) => void;
  onDelete: () => void;
}) {
  return (
    <div className="border border-slate-700 rounded-lg p-4 flex flex-col gap-3 bg-slate-800/30">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-slate-400">{logic.logic_id.slice(0, 8)}</span>
        <div className="flex gap-2 items-center">
          <select
            className="input text-xs py-1 w-44"
            value={logic.match_strategy}
            onChange={(e) =>
              onUpdate({ ...logic, match_strategy: e.target.value as TargetLogic["match_strategy"] })
            }
          >
            <option value="first_occurrence">first_occurrence</option>
            <option value="all_occurrences">all_occurrences</option>
          </select>
          <button className="btn-danger py-1 px-2 text-xs" onClick={onDelete}>삭제</button>
        </div>
      </div>

      <Field label="search_pattern (정확한 코드 문자열)">
        <textarea
          className="input text-xs font-mono resize-none"
          rows={3}
          placeholder="치환할 정확한 코드를 입력하세요"
          value={logic.search_pattern}
          onChange={(e) => onUpdate({ ...logic, search_pattern: e.target.value })}
        />
      </Field>

      <Field label="code_snippet (정답 코드)">
        <textarea
          className="input text-xs font-mono resize-none"
          rows={4}
          placeholder="수강생이 완성해야 할 정답 코드"
          value={logic.code_snippet}
          onChange={(e) => onUpdate({ ...logic, code_snippet: e.target.value })}
        />
      </Field>
    </div>
  );
}
