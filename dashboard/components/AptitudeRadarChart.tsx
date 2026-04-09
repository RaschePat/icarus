"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { AptitudeScores } from "@/lib/types";

interface Props {
  aptitude: AptitudeScores;
  /** 비교 기준선 (학급 평균 등). 없으면 표시 안 함 */
  baseline?: AptitudeScores;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = { sm: 160, md: 260, lg: 360 };

const AXIS_STYLE = {
  fontSize: 12,
  fontWeight: 600,
  fill: "#94a3b8",
};

const COLOR_MAP: Record<string, string> = {
  Logic:    "#6366f1",
  Planning: "#f59e0b",
  UX:       "#ec4899",
  Data:     "#10b981",
};

// Recharts용 커스텀 툴팁
function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: { subject: string; score: number } }[] }) {
  if (!active || !payload?.length) return null;
  const { subject, score } = payload[0].payload;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs">
      <span className="font-bold" style={{ color: COLOR_MAP[subject] ?? "#fff" }}>{subject}</span>
      <span className="text-slate-300 ml-2">{score.toFixed(1)}</span>
    </div>
  );
}

export default function AptitudeRadarChart({ aptitude, baseline, size = "md" }: Props) {
  const data = [
    { subject: "Logic",    score: aptitude.logic_avg,    base: baseline?.logic_avg    ?? 0, fullMark: 100 },
    { subject: "Planning", score: aptitude.planning_avg, base: baseline?.planning_avg ?? 0, fullMark: 100 },
    { subject: "UX",       score: aptitude.ux_avg,       base: baseline?.ux_avg       ?? 0, fullMark: 100 },
    { subject: "Data",     score: aptitude.data_avg,     base: baseline?.data_avg     ?? 0, fullMark: 100 },
  ];

  const px = SIZE_MAP[size];

  return (
    <ResponsiveContainer width="100%" height={px}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="#334155" />
        <PolarAngleAxis dataKey="subject" tick={AXIS_STYLE} />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fontSize: 9, fill: "#475569" }}
          tickCount={5}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* 학급 평균 기준선 */}
        {baseline && (
          <Radar
            name="학급 평균"
            dataKey="base"
            stroke="#475569"
            fill="#475569"
            fillOpacity={0.15}
            strokeDasharray="4 2"
          />
        )}

        {/* 학생 적성 */}
        <Radar
          name="적성 점수"
          dataKey="score"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.35}
          strokeWidth={2}
          dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

/** 4개 점수를 작은 가로 바로 표시하는 보조 컴포넌트 */
export function AptitudeBarSummary({ aptitude }: { aptitude: AptitudeScores }) {
  const items = [
    { label: "Logic",    score: aptitude.logic_avg,    color: "bg-indigo-500" },
    { label: "Planning", score: aptitude.planning_avg, color: "bg-amber-500"  },
    { label: "UX",       score: aptitude.ux_avg,       color: "bg-pink-500"   },
    { label: "Data",     score: aptitude.data_avg,     color: "bg-emerald-500"},
  ];
  return (
    <div className="flex flex-col gap-1.5">
      {items.map(({ label, score, color }) => (
        <div key={label} className="flex items-center gap-2 text-xs">
          <span className="w-14 text-slate-400 shrink-0">{label}</span>
          <div className="flex-1 bg-slate-800 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${color} transition-all`}
              style={{ width: `${score}%` }}
            />
          </div>
          <span className="w-8 text-right text-slate-300 font-mono">{score.toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
}
