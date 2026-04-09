import type { MicroProject, ProjectTemplate } from "@/lib/types";

interface Props {
  projects: MicroProject[];
}

const TEMPLATE_META: Record<ProjectTemplate, { icon: string; label: string; color: string }> = {
  java:   { icon: "☕", label: "Java",   color: "text-amber-400"  },
  python: { icon: "🐍", label: "Python", color: "text-blue-400"   },
  node:   { icon: "🟢", label: "Node",   color: "text-emerald-400"},
};

const CATEGORY_COLOR: Record<string, string> = {
  게임:   "bg-purple-950/40 text-purple-400 border-purple-500/40",
  패션:   "bg-pink-950/40 text-pink-400 border-pink-500/40",
  의료:   "bg-blue-950/40 text-blue-400 border-blue-500/40",
  펫:     "bg-amber-950/40 text-amber-400 border-amber-500/40",
  금융:   "bg-emerald-950/40 text-emerald-400 border-emerald-500/40",
  교육:   "bg-indigo-950/40 text-indigo-400 border-indigo-500/40",
  커머스: "bg-orange-950/40 text-orange-400 border-orange-500/40",
  음식:   "bg-red-950/40 text-red-400 border-red-500/40",
  기타:   "bg-slate-800 text-slate-400 border-slate-600",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function ProjectCard({ project }: { project: MicroProject }) {
  const { name, template, created_at, interest_category, harness_total, harness_filled } = project;
  const tmpl     = TEMPLATE_META[template];
  const catCls   = CATEGORY_COLOR[interest_category] ?? CATEGORY_COLOR["기타"];
  const complete = harness_filled >= harness_total;
  const fillPct  = harness_total > 0 ? Math.round((harness_filled / harness_total) * 100) : 0;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex flex-col gap-3
                    hover:border-slate-600 transition-colors">
      {/* 상단: 템플릿 아이콘 + 프로젝트명 */}
      <div className="flex items-start gap-2">
        <span className="text-xl leading-none mt-0.5">{tmpl.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm font-semibold text-slate-100 truncate" title={name}>
            {name}
          </p>
          <p className={`text-xs font-medium mt-0.5 ${tmpl.color}`}>{tmpl.label}</p>
        </div>
      </div>

      {/* 메타 정보 */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* 관심사 카테고리 */}
        <span className={`text-xs px-2 py-0.5 rounded-full border ${catCls}`}>
          {interest_category}
        </span>
        {/* 생성일 */}
        <span className="text-xs text-slate-500">{formatDate(created_at)}</span>
      </div>

      {/* 빈칸 진행률 */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">빈칸 완성도</span>
          {complete ? (
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/40
                             border border-emerald-500/40 px-2 py-0.5 rounded-full">
              완성
            </span>
          ) : (
            <span className="text-xs font-semibold text-amber-400 bg-amber-950/40
                             border border-amber-500/40 px-2 py-0.5 rounded-full">
              진행 중 {harness_filled}/{harness_total}
            </span>
          )}
        </div>
        <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all ${complete ? "bg-emerald-500" : "bg-amber-500"}`}
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function MicroProjectList({ projects }: Props) {
  if (projects.length === 0) {
    return (
      <p className="text-slate-500 text-sm text-center py-6">
        아직 생성된 마이크로 프로젝트가 없습니다.
      </p>
    );
  }

  const completed  = projects.filter((p) => p.harness_filled >= p.harness_total).length;
  const inProgress = projects.length - completed;

  return (
    <div className="flex flex-col gap-4">
      {/* 요약 */}
      <div className="flex gap-3 text-xs">
        <span className="text-slate-400">총 <span className="text-slate-200 font-semibold">{projects.length}</span>개</span>
        <span className="text-emerald-400">완성 <span className="font-semibold">{completed}</span></span>
        {inProgress > 0 && (
          <span className="text-amber-400">진행 중 <span className="font-semibold">{inProgress}</span></span>
        )}
      </div>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {projects
          .slice()
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map((p) => (
            <ProjectCard key={p.project_id} project={p} />
          ))}
      </div>
    </div>
  );
}
