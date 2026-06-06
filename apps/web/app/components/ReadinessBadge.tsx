import type { ReadinessBadgeModel } from "@/lib/investment-readiness";

const TONE_STYLE: Record<ReadinessBadgeModel["tone"], string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  neutral: "border-line bg-paper text-ink-soft",
  accent: "border-blue-200 bg-blue-50 text-blue-700",
};

export default function ReadinessBadge({ badge, compact = false }: { badge: ReadinessBadgeModel; compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${TONE_STYLE[badge.tone]} ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      }`}
      title={badge.reasons.join(" • ")}
    >
      {badge.label}
    </span>
  );
}
