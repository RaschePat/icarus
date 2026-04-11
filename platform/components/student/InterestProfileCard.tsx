import type { InterestProfile } from "@/lib/types";

interface Props {
  interest: InterestProfile;
}

// 카테고리별 색상 매핑
const CATEGORY_COLORS: Record<string, { bar: string; badge: string; text: string; rgb: string }> = {
  패션:   { bar: "bg-pink-500",    badge: "bg-pink-950/40 border-pink-500/40",     text: "text-pink-400",    rgb: "236,72,153"  },
  의료:   { bar: "bg-blue-500",    badge: "bg-blue-950/40 border-blue-500/40",     text: "text-blue-400",    rgb: "59,130,246"  },
  펫:     { bar: "bg-amber-500",   badge: "bg-amber-950/40 border-amber-500/40",   text: "text-amber-400",   rgb: "245,158,11"  },
  게임:   { bar: "bg-purple-500",  badge: "bg-purple-950/40 border-purple-500/40", text: "text-purple-400",  rgb: "168,85,247"  },
  금융:   { bar: "bg-emerald-500", badge: "bg-emerald-950/40 border-emerald-500/40",text: "text-emerald-400",rgb: "16,185,129"  },
  교육:   { bar: "bg-indigo-500",  badge: "bg-indigo-950/40 border-indigo-500/40", text: "text-indigo-400",  rgb: "99,102,241"  },
  커머스: { bar: "bg-orange-500",  badge: "bg-orange-950/40 border-orange-500/40", text: "text-orange-400",  rgb: "249,115,22"  },
  음식:   { bar: "bg-red-500",     badge: "bg-red-950/40 border-red-500/40",       text: "text-red-400",     rgb: "239,68,68"   },
  기타:   { bar: "bg-slate-500",   badge: "bg-slate-800 border-slate-600",         text: "text-slate-400",   rgb: "100,116,139" },
};

function getColor(category: string) {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS["기타"];
}

/** keyword_freq에서 빈도 기반 시각 속성을 계산합니다 */
function buildCloudItems(
  keyword_freq?: Record<string, number> | null,
  top_keywords?: string[] | null,
  rgb?: string,
) {
  try {
    // 안전한 기본값 처리
    const freq = keyword_freq && typeof keyword_freq === "object" ? keyword_freq : {};
    const keywords = Array.isArray(top_keywords) ? top_keywords : [];
    const rgbValue = rgb || "100,116,139";

    if (keywords.length === 0 || Object.keys(freq).length === 0) {
      return [];
    }

    const items = keywords
      .filter((kw) => typeof kw === "string" && freq && Object.prototype.hasOwnProperty.call(freq, kw) && (freq[kw] ?? 0) > 0)
      .map((kw) => ({ kw, freq: freq[kw] ?? 0 }));

    if (items.length === 0) return [];

    const maxFreq = Math.max(...items.map((i) => i.freq));
    const minFreq = Math.min(...items.map((i) => i.freq));
    const range   = maxFreq - minFreq || 1;

    return items.map(({ kw, freq }) => {
      const ratio      = (freq - minFreq) / range;           // 0(최소) ~ 1(최대)
      const fontSize   = Math.round(14 + ratio * 14);        // 14px ~ 28px
      const textOpacity = parseFloat((0.5 + ratio * 0.5).toFixed(2)); // 0.5 ~ 1.0
      const bgAlpha    = parseFloat((0.08 + ratio * 0.14).toFixed(2)); // 0.08 ~ 0.22
      const borderAlpha = parseFloat((0.2 + ratio * 0.35).toFixed(2)); // 0.2 ~ 0.55
      const fontWeight = ratio > 0.6 ? 700 : ratio > 0.3 ? 600 : 400;
      const background = `rgba(${rgbValue},${bgAlpha})`;
      const borderColor = `rgba(${rgbValue},${borderAlpha})`;
      return { kw, freq, fontSize, textOpacity, fontWeight, background, borderColor };
    });
  } catch (err) {
    console.error("buildCloudItems 에러:", err);
    return [];
  }
}

export default function InterestProfileCard({ interest }: Props) {
  // 모든 필드에 기본값 처리
  const {
    category_counts = {},
    top_category,
    top_keywords = [],
    keyword_freq = {},
  } = interest || {};

  const sortedCategories = Object.entries(category_counts || {}).sort((a, b) => b[1] - a[1]);
  const maxCount   = sortedCategories[0]?.[1] ?? 1;
  const topColor   = top_category ? getColor(top_category) : getColor("기타");
  const cloudItems = buildCloudItems(keyword_freq || {}, top_keywords || [], topColor.rgb);

  return (
    <div className="card flex flex-col gap-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <p className="section-title mb-0">관심사 프로필</p>
        {top_category && (
          <span className={`badge border text-xs font-semibold ${topColor.badge} ${topColor.text}`}>
            {top_category}
          </span>
        )}
      </div>

      {/* 카테고리별 바 차트 */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-slate-500 mb-1">도메인 분포</p>
        {sortedCategories.length > 0 ? (
          sortedCategories.map(([cat, count]) => {
            const { bar, text } = getColor(cat);
            const widthPct = Math.round((count / maxCount) * 100);
            return (
              <div key={cat} className="flex items-center gap-2">
                <span className={`text-xs w-12 shrink-0 text-right ${text}`}>{cat}</span>
                <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${bar} transition-all`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 w-4 text-right">{count}</span>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-slate-500 py-2">데이터 없음</p>
        )}
      </div>

      {/* 핵심 키워드 태그 클라우드 */}
      {cloudItems.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-2">핵심 키워드</p>
          <div className="flex flex-wrap gap-x-2 gap-y-2 items-end">
            {cloudItems.map(({ kw, freq, fontSize, textOpacity, fontWeight, background, borderColor }) => (
              <span
                key={kw}
                title={`${kw} (${freq}회)`}
                className="px-2.5 py-1 rounded-full border cursor-default
                           transition-transform duration-150 ease-out hover:scale-110"
                style={{
                  fontSize,
                  fontWeight,
                  opacity: textOpacity,
                  background,
                  borderColor,
                  color: "#e2e8f0",   /* slate-200 */
                  lineHeight: 1.3,
                }}
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
