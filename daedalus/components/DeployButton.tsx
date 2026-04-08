"use client";

import { useState } from "react";
import { syncLesson } from "@/lib/api";
import type { LessonContext } from "@/lib/types";

interface Props {
  lesson: LessonContext;
  disabled?: boolean;
}

type DeployState = "idle" | "loading" | "success" | "error";

export default function DeployButton({ lesson, disabled }: Props) {
  const [state, setState] = useState<DeployState>("idle");
  const [message, setMessage] = useState("");

  const deploy = async () => {
    if (state === "loading") return;

    // 최소 유효성 검사
    if (!lesson.metadata.topic.trim()) {
      setMessage("수업 주제를 입력해야 배포할 수 있습니다.");
      setState("error");
      return;
    }

    setState("loading");
    setMessage("");
    try {
      const res = await syncLesson({
        ...lesson,
        metadata: { ...lesson.metadata, timestamp: new Date().toISOString() },
      });
      setState("success");
      setMessage(`배포 완료 — lesson_id: ${res.lesson_id}`);
    } catch (e) {
      setState("error");
      setMessage((e as Error).message);
    }
  };

  const btnStyle = {
    idle:    "bg-blue-600 hover:bg-blue-500 text-white",
    loading: "bg-blue-700 text-blue-200 cursor-wait",
    success: "bg-emerald-700 hover:bg-emerald-600 text-white",
    error:   "bg-red-700 hover:bg-red-600 text-white",
  }[state];

  const btnLabel = {
    idle:    "🚀 배포 (POST /lesson/sync)",
    loading: "배포 중…",
    success: "✓ 배포 완료",
    error:   "다시 배포",
  }[state];

  return (
    <div className="card flex flex-col gap-3">
      <h2 className="font-semibold text-sm">🚀 수업 배포</h2>

      {/* 배포 요약 */}
      <div className="bg-slate-800 rounded-lg p-3 text-xs space-y-1 font-mono">
        <div className="flex justify-between">
          <span className="text-slate-400">lesson_id</span>
          <span className="text-slate-200">{lesson.lesson_id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">topic</span>
          <span className="text-slate-200 truncate max-w-[60%] text-right">
            {lesson.metadata.topic || "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">keywords</span>
          <span className="text-slate-200">{lesson.knowledge_base.keywords.length}개</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">core_concepts</span>
          <span className="text-slate-200">{lesson.knowledge_base.core_concepts.length}개</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">target_logic</span>
          <span className="text-slate-200">{lesson.harness_config.target_logic.length}개</span>
        </div>
      </div>

      <button
        className={`w-full py-3 rounded-lg font-bold text-sm transition-colors ${btnStyle}`}
        onClick={deploy}
        disabled={disabled || state === "loading"}
      >
        {btnLabel}
      </button>

      {message && (
        <p
          className={`text-xs px-3 py-2 rounded-lg ${
            state === "success"
              ? "bg-emerald-950/50 text-emerald-300"
              : "bg-red-950/50 text-red-300"
          }`}
        >
          {message}
        </p>
      )}

      <p className="text-slate-600 text-xs">
        배포 후 Wing 에이전트가 즉시 최신 지식을 수신합니다.
      </p>
    </div>
  );
}
