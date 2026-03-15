import type { ScoreResponse } from '@/types/scoring';
import { TIER_COLORS } from '@/types/scoring';

interface ScoreBadgeProps {
  score: ScoreResponse;
  listingId: number;
  isPanelOpen: boolean;
  isStale?: boolean;
}

/**
 * Score badge displayed next to each listing card.
 * Dispatches a custom DOM event on click so the App component
 * (in a separate React root) can toggle the summary panel.
 *
 * When isStale is true (active profile changed since scoring),
 * shows an amber "!" indicator and reduced opacity.
 */
export function ScoreBadge({ score, listingId, isPanelOpen, isStale }: ScoreBadgeProps) {
  const tierColor = TIER_COLORS[score.match_tier];

  const handleClick = () => {
    document.dispatchEvent(
      new CustomEvent('homematch:panel-toggle', { detail: { id: listingId } }),
    );
  };

  return (
    <button
      onClick={handleClick}
      className={`relative inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 shadow-md cursor-pointer transition-all duration-200 bg-white/95 backdrop-blur-sm border ${
        isStale
          ? 'opacity-60 ring-2 ring-amber-400/70 border-amber-200'
          : 'hover:shadow-lg border-gray-100'
      }`}
      aria-expanded={isPanelOpen}
      aria-label={`Score: ${score.overall_score}, ${score.match_tier} match${isStale ? ' (outdated)' : ''}`}
    >
      {/* Stale indicator */}
      {isStale && (
        <span className="absolute -top-2 -right-2 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-full px-1.5 py-0.5 border border-amber-300 shadow-sm">
          !
        </span>
      )}

      {/* Score circle */}
      <span
        className="inline-flex items-center justify-center rounded-full text-base font-extrabold"
        style={{
          width: 40,
          height: 40,
          backgroundColor: tierColor.bg,
          color: tierColor.text,
        }}
      >
        {score.overall_score}
      </span>

      {/* Match tier label */}
      <span
        className="text-xs font-semibold capitalize pr-1"
        style={{ color: tierColor.bg }}
      >
        {score.match_tier}
      </span>
    </button>
  );
}
