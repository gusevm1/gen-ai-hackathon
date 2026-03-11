import type { ScoreResponse } from '@/types/scoring';

interface SummaryPanelProps {
  score: ScoreResponse;
  listingId: number;
  isOpen: boolean;
}

const WEBSITE_URL = 'https://homematch-web.vercel.app';

/**
 * Expandable summary panel shown below a score badge when clicked.
 * Displays 3-5 bullet points from the ScoreResponse and a link to the full analysis page.
 * Uses Tailwind classes inside per-badge Shadow DOM (style isolation from Flatfox CSS).
 */
export function SummaryPanel({ score, listingId, isOpen }: SummaryPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-w-xs">
      <h4 className="text-sm font-bold text-gray-900 mb-2">Match Summary</h4>

      <ul className="space-y-1 mb-3">
        {score.summary_bullets.map((bullet, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <div className="border-t border-gray-200 pt-2">
        <button
          onClick={() => window.open(`${WEBSITE_URL}/analysis/${listingId}`, '_blank')}
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer"
        >
          See full analysis
        </button>
      </div>
    </div>
  );
}
