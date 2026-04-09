import StudentCard from "@/components/StudentCard";
import RedFlagList from "@/components/RedFlagList";
import { DEMO_STUDENTS, DEMO_REDFLAGS } from "@/lib/demo";
import type { AptitudeScores } from "@/lib/types";

function calcClassAvg(students: typeof DEMO_STUDENTS): AptitudeScores {
  const n = students.length || 1;
  return {
    logic_avg:    students.reduce((a, s) => a + s.aptitude.logic_avg,    0) / n,
    planning_avg: students.reduce((a, s) => a + s.aptitude.planning_avg, 0) / n,
    ux_avg:       students.reduce((a, s) => a + s.aptitude.ux_avg,       0) / n,
    data_avg:     students.reduce((a, s) => a + s.aptitude.data_avg,     0) / n,
  };
}

export default function DashboardPage() {
  const classAvg = calcClassAvg(DEMO_STUDENTS);
  const flagCount = DEMO_REDFLAGS.length;
  const highCount = DEMO_REDFLAGS.filter((r) => r.severity === "HIGH").length;
  const tagCounts: Record<string, number> = {};
  DEMO_STUDENTS.forEach((s) =>
    s.career_identity.forEach((t) => { tagCounts[t] = (tagCounts[t] ?? 0) + 1; })
  );

  return (
    <div className="flex flex-col gap-6">

      {/* 상단 요약 통계 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "전체 수강생",    value: `${DEMO_STUDENTS.length}명`,  cls: "text-slate-100" },
          { label: "이탈 위험 (HIGH)", value: `${highCount}명`,           cls: highCount > 0 ? "text-red-400" : "text-slate-300" },
          { label: "이탈 위험 (MID)", value: `${flagCount - highCount}명`, cls: flagCount - highCount > 0 ? "text-amber-400" : "text-slate-300" },
          { label: "학급 평균 Logic", value: `${classAvg.logic_avg.toFixed(1)}`,  cls: "text-indigo-400" },
        ].map(({ label, value, cls }) => (
          <div key={label} className="card text-center">
            <p className={`text-2xl font-bold ${cls}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* career_identity 태그 분포 */}
      {Object.keys(tagCounts).length > 0 && (
        <div className="card flex flex-wrap gap-3 items-center">
          <p className="section-title mb-0 mr-2">태그 분포</p>
          {Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([tag, cnt]) => (
              <span
                key={tag}
                className="badge bg-slate-800 text-slate-300 border border-slate-600 text-xs"
              >
                {tag}
                <span className="ml-1 text-slate-500">{cnt}명</span>
              </span>
            ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        {/* 학생 카드 그리드 */}
        <div>
          <p className="section-title">학생별 적성 현황</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEMO_STUDENTS.map((s) => (
              <StudentCard key={s.user_id} student={s} />
            ))}
          </div>
        </div>

        {/* 이탈 위험군 패널 */}
        <div>
          <p className="section-title">이탈 위험군 알림</p>
          <RedFlagList redflags={DEMO_REDFLAGS} />
        </div>
      </div>
    </div>
  );
}
