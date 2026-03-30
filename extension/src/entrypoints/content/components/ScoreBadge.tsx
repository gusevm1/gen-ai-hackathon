import type { ScoreResponse } from '@/types/scoring';
import { TIER_COLORS } from '@/types/scoring';

interface ScoreBadgeProps {
  score: ScoreResponse;
  listingId: number;
  isPanelOpen: boolean;
  isStale?: boolean;
  staleReason?: 'profile-switch' | 'preferences-changed';
}

/**
 * Score badge displayed next to each listing card.
 * Dispatches a custom DOM event on click so the App component
 * (in a separate React root) can toggle the summary panel.
 *
 * Stale styling varies by reason:
 * - profile-switch: amber ring with "!" indicator
 * - preferences-changed: greyed-out with warning icon
 */
export function ScoreBadge({ score, listingId, isPanelOpen, isStale, staleReason }: ScoreBadgeProps) {
  const handleClick = () => {
    document.dispatchEvent(
      new CustomEvent('homematch:panel-toggle', { detail: { id: listingId } }),
    );
  };

  // Grey beta badge for listings without enrichment data
  if (score.enrichment_status === 'unavailable') {
    return (
      <button
        onClick={handleClick}
        className="relative inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 shadow-md cursor-pointer transition-all duration-200 bg-gray-50 backdrop-blur-sm border border-gray-300 opacity-70 hover:opacity-90"
        aria-expanded={isPanelOpen}
        aria-label="Scoring not yet available for this area"
      >
        <span
          className="inline-flex items-center justify-center rounded-full bg-gray-400 text-white text-sm font-bold"
          style={{ width: 40, height: 40 }}
        >
          --
        </span>
        <span className="text-xs font-semibold text-gray-500 pr-1">
          Beta
        </span>
      </button>
    );
  }

  const tierColor = TIER_COLORS[score.match_tier];
  const isPrefStale = isStale && staleReason === 'preferences-changed';
  const isProfileStale = isStale && staleReason === 'profile-switch';

  return (
    <button
      onClick={handleClick}
      className={`relative inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 shadow-md cursor-pointer transition-all duration-200 bg-white/95 backdrop-blur-sm border ${
        isPrefStale
          ? 'opacity-50 grayscale border-gray-300'
          : isProfileStale
          ? 'opacity-60 ring-2 ring-amber-400/70 border-amber-200'
          : 'hover:shadow-lg border-gray-100'
      }`}
      aria-expanded={isPanelOpen}
      aria-label={`Score: ${score.overall_score}, ${score.match_tier} match${isPrefStale ? ' (preferences changed)' : isProfileStale ? ' (outdated)' : ''}`}
    >
      {/* Stale indicator -- different for each reason */}
      {isPrefStale && (
        <span className="absolute -top-2 -right-2 bg-gray-100 text-gray-600 text-[9px] font-bold rounded-full px-1.5 py-0.5 border border-gray-300 shadow-sm">
          &#x26A0;
        </span>
      )}
      {isProfileStale && (
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
