"use client";

import { useState } from "react";
import type { Session } from "@/lib/types";
import AptitudeRadarChart from "./AptitudeRadarChart";

interface Props {
  sessions: Session[];
}

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// 세션별 적성 점수를 AptitudeScores 형식으로 변환
function toAptitude(s: Session) {
  return {
    logic_avg:    s.session_aptitude.logic_score,
    planning_avg: s.session_aptitude.planning_score,
    ux_avg:       s.session_aptitude.ux_score,
    data_avg:     s.session_aptitude.data_score,
  };
}

function MetricPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-800 rounded-lg p-3 text-center">
      <p className="text-lg font-bold text-slate-100">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function SessionReportView({ sessions }: Props) {
  const [selectedId, setSelectedId] = useState<string>(sessions[0]?.session_id ?? "");
  const selected = sessions.find((s) => s.session_id === selectedId);

  if (sessions.length === 0) {
    return <p className="text-slate-500 text-sm text-center py-8">세션 기록이 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 세션 선택 탭 */}
      <div className="flex gap-2 flex-wrap">
        {[...sessions].reverse().map((s) => (
          <button
            key={s.session_id}
            onClick={() => setSelectedId(s.session_id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              s.session_id === selectedId
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {formatDate(s.timestamp_start)}
          </button>
        ))}
      </div>

      {selected && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 세션 방사형 차트 */}
          <div className="card">
            <p className="section-title">세션 적성 점수</p>
            <AptitudeRadarChart aptitude={toAptitude(selected)} size="md" />
          </div>

          {/* 행동 지표 */}
          <div className="card flex flex-col gap-4">
            <p className="section-title">행동 지표</p>
            {selected.metrics ? (
              <div className="grid grid-cols-2 gap-2">
                <MetricPill
                  label="집중 시간"
                  value={fmt(selected.metrics.focused_seconds)}
                  sub={`전체 ${fmt(selected.metrics.total_seconds)}`}
                />
                <MetricPill
                  label="집중도"
                  value={`${(selected.metrics.focus_ratio * 100).toFixed(1)}%`}
                  sub={`이탈 ${fmt(selected.metrics.distracted_seconds)}`}
                />
                <MetricPill
                  label="직접 시도"
                  value={`${selected.metrics.harness_error_count}회`}
                  sub="HARNESS_ERROR 기반"
                />
                <MetricPill
                  label="자립도"
                  value={`${(selected.metrics.autonomy_score * 100).toFixed(1)}%`}
                  sub={`붙여넣기 ${(selected.metrics.paste_ratio * 100).toFixed(1)}%`}
                />
              </div>
            ) : (
              <p className="text-slate-500 text-sm">행동 지표 데이터 없음</p>
            )}

            {/* AI 코멘트 */}
            {selected.ai_comment && (
              <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-lg p-3">
                <p className="text-xs text-indigo-400 font-semibold mb-1">Insight AI 코멘트</p>
                <p className="text-sm text-slate-300 leading-relaxed">{selected.ai_comment}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
