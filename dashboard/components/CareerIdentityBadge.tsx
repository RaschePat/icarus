// career_identity 태그 배지 컴포넌트
// #Logic | #Planning | #UX | #Data → 각각 고유 색상

const TAG_STYLES: Record<string, string> = {
  "#Logic":    "bg-indigo-900/60 text-indigo-300 border border-indigo-500/40",
  "#Planning": "bg-amber-900/60  text-amber-300  border border-amber-500/40",
  "#UX":       "bg-pink-900/60   text-pink-300   border border-pink-500/40",
  "#Data":     "bg-emerald-900/60 text-emerald-300 border border-emerald-500/40",
};

const TAG_ICONS: Record<string, string> = {
  "#Logic":    "⚙",
  "#Planning": "🗺",
  "#UX":       "✦",
  "#Data":     "◈",
};

interface Props {
  tags: string[];
  size?: "sm" | "md";
}

export default function CareerIdentityBadge({ tags, size = "md" }: Props) {
  if (tags.length === 0) {
    return (
      <span className="badge bg-slate-800 text-slate-500 border border-slate-700 text-xs">
        미분류
      </span>
    );
  }

  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className={`badge ${TAG_STYLES[tag] ?? "bg-slate-700 text-slate-300"} ${textSize}`}
        >
          <span>{TAG_ICONS[tag] ?? "•"}</span>
          {tag}
        </span>
      ))}
    </div>
  );
}
