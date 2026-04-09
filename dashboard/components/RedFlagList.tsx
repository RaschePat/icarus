import Link from "next/link";
import type { RedFlag } from "@/lib/types";

interface Props {
  redflags: RedFlag[];
}

const SEVERITY_STYLE = {
  HIGH: {
    border: "border-red-500/50",
    bg: "bg-red-950/30",
    badge: "bg-red-900/60 text-red-300",
    icon: "🚨",
    label: "HIGH",
  },
  MID: {
    border: "border-amber-500/40",
    bg: "bg-amber-950/20",
    badge: "bg-amber-900/50 text-amber-300",
    icon: "⚠️",
    label: "MID",
  },
};

const CAUSE_LABEL: Record<string, { text: string; cls: string }> = {
  DIFFICULTY:    { text: "난이도",   cls: "bg-blue-900/40 text-blue-300" },
  DISENGAGEMENT: { text: "참여도 저하", cls: "bg-purple-900/40 text-purple-300" },
};

function timeAgo(isoStr: string): string {
  const diff = (Date.now() - new Date(isoStr).getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function RedFlagList({ redflags }: Props) {
  const sorted = [...redflags].sort((a, b) =>
    a.severity === "HIGH" && b.severity !== "HIGH" ? -1 : 1
  );

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="section-title mb-0">이탈 위험군</p>
        <span className="badge bg-red-900/40 text-red-300 text-xs">
          {redflags.length}명
        </span>
      </div>

      {sorted.length === 0 && (
        <p className="text-slate-500 text-sm text-center py-6">
          감지된 이탈 위험 학생이 없습니다. ✓
        </p>
      )}

      <div className="flex flex-col gap-2">
        {sorted.map((rf) => {
          const sev = SEVERITY_STYLE[rf.severity];
          const cause = CAUSE_LABEL[rf.cause];
          return (
            <Link
              key={rf.user_id}
              href={`/student/${rf.user_id}`}
              className={`border ${sev.border} ${sev.bg} rounded-xl p-4 flex gap-4 hover:opacity-90 transition-opacity`}
            >
              {/* 아이콘 + 심각도 */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <span className="text-2xl">{sev.icon}</span>
                <span className={`badge ${sev.badge} text-xs`}>{sev.label}</span>
              </div>

              {/* 내용 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{rf.name}</span>
                  <span className={`badge ${cause.cls} text-xs`}>{cause.text}</span>
                  <span className="text-slate-500 text-xs ml-auto shrink-0">
                    {timeAgo(rf.detected_at)}
                  </span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">{rf.reason}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
