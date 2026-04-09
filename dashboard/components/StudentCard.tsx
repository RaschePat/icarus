import Link from "next/link";
import type { StudentSummary } from "@/lib/types";
import CareerIdentityBadge from "./CareerIdentityBadge";
import { AptitudeBarSummary } from "./AptitudeRadarChart";

interface Props {
  student: StudentSummary;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function StudentCard({ student: s }: Props) {
  const hasFlag = !!s.red_flag;
  const borderCls = s.red_flag?.severity === "HIGH"
    ? "border-red-500/50 hover:border-red-400/70"
    : s.red_flag?.severity === "MID"
    ? "border-amber-500/40 hover:border-amber-400/60"
    : "border-slate-700/60 hover:border-slate-500/80";

  return (
    <Link
      href={`/student/${s.user_id}`}
      className={`card border ${borderCls} flex flex-col gap-3 transition-colors cursor-pointer`}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            {hasFlag && (
              <span className="text-base">{s.red_flag!.severity === "HIGH" ? "🚨" : "⚠️"}</span>
            )}
            <span className="font-semibold text-sm">{s.name}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {s.session_count}회 세션 · {formatDate(s.last_updated)}
          </p>
        </div>
        <CareerIdentityBadge tags={s.career_identity} size="sm" />
      </div>

      {/* 적성 바 요약 */}
      <AptitudeBarSummary aptitude={s.aptitude} />

      {/* RED FLAG 원인 */}
      {s.red_flag && (
        <div className={`text-xs px-2 py-1 rounded-lg ${
          s.red_flag.severity === "HIGH"
            ? "bg-red-950/50 text-red-300"
            : "bg-amber-950/40 text-amber-300"
        }`}>
          {s.red_flag.cause === "DISENGAGEMENT" ? "참여도 저하" : "난이도 원인"} 감지
        </div>
      )}
    </Link>
  );
}
