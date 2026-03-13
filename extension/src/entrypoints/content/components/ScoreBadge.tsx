import type { ScoreResponse } from '@/types/scoring';
import { TIER_COLORS } from '@/types/scoring';

interface ScoreBadgeProps {
  score: ScoreResponse;
  listingId: number;
  isPanelOpen: boolean;
}

/**
 * Score badge displayed next to each listing card.
 * Dispatches a custom DOM event on click so the App component
 * (in a separate React root) can toggle the summary panel.
 */
export function ScoreBadge({ score, listingId, isPanelOpen }: ScoreBadgeProps) {
  const tierColor = TIER_COLORS[score.match_tier];

  const handleClick = () => {
    document.dispatchEvent(
      new CustomEvent('homematch:panel-toggle', { detail: { id: listingId } }),
    );
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 rounded-full px-2 py-1 shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-150 bg-white border border-gray-200"
      aria-expanded={isPanelOpen}
      aria-label={`Score: ${score.overall_score}, ${score.match_tier} match`}
    >
      {/* Score circle */}
      <span
        className="inline-flex items-center justify-center rounded-full text-sm font-bold"
        style={{
          width: 36,
          height: 36,
          backgroundColor: tierColor.bg,
          color: tierColor.text,
        }}
      >
        {score.overall_score}
      </span>

      {/* Match tier label */}
      <span
        className="text-xs font-medium capitalize pr-1"
        style={{ color: tierColor.bg }}
      >
        {score.match_tier}
      </span>
    </button>
  );
}
