import type { ScoreResponse } from '@/types/scoring';

interface SummaryPanelProps {
  score: ScoreResponse;
  listingId: number;
  isOpen: boolean;
  isStale?: boolean;
  staleReason?: 'profile-switch' | 'preferences-changed';
  profileName?: string;
}

const WEBSITE_URL = 'https://homematch-web.vercel.app';

/**
 * Expandable summary panel shown below a score badge when clicked.
 * Displays 3-5 bullet points from the ScoreResponse and a link to the full analysis page.
 * Uses Tailwind classes inside per-badge Shadow DOM (style isolation from Flatfox CSS).
 *
 * Shows distinct stale warnings:
 * - preferences-changed: grey banner suggesting long-press to re-score
 * - profile-switch: amber banner suggesting click to re-score
 */
export function SummaryPanel({ score, listingId, isOpen, isStale, staleReason, profileName }: SummaryPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="mt-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-100 p-4 max-w-sm">
      {/* Preference-stale warning banner */}
      {isStale && staleReason === 'preferences-changed' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 mb-2 text-xs text-gray-600">
          Preferences changed -- hold the FAB to re-score
        </div>
      )}
      {/* Profile-switch stale warning banner */}
      {isStale && staleReason === 'profile-switch' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mb-2 text-xs text-amber-700">
          Scores may be outdated -- click the FAB to re-score with your new profile
        </div>
      )}

      <h4 className="text-sm font-semibold text-gray-900 mb-1">Match Summary</h4>

      {/* Profile attribution */}
      {profileName && (
        <p className="text-xs text-gray-500 mb-2">Profile: {profileName}</p>
      )}

      <ul className="space-y-1.5 mb-3">
        {score.summary_bullets.map((bullet, i) => (
          <li key={i} className="flex items-start gap-1.5 text-[13px] text-gray-700">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <div className="border-t border-gray-100 pt-2">
        <button
          onClick={() => window.open(`${WEBSITE_URL}/analysis/${listingId}`, '_blank')}
          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium cursor-pointer transition-colors duration-150"
        >
          See full analysis
          {/* Small right arrow icon */}
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
