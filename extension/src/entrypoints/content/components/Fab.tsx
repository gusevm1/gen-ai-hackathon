import { useEffect, useState } from 'react';

interface FabProps {
  onClick: () => void;
  isScoring: boolean;
  scoredCount: number;
  error: string | null;
}

/**
 * Floating Action Button for triggering listing scoring.
 * Positioned bottom-right via the Shadow DOM overlay.
 * Uses Tailwind classes (inside Shadow DOM, styles are isolated).
 */
export function Fab({ onClick, isScoring, scoredCount, error }: FabProps) {
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
    setShowError(false);
  }, [error]);

  return (
    <div className="fixed bottom-6 right-6 z-[999999] flex flex-col items-end gap-2">
      {/* Error tooltip */}
      {showError && error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 max-w-xs shadow-lg">
          {error}
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={onClick}
        disabled={isScoring}
        className="relative w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
        aria-label="Score listings with HomeMatch"
      >
        {isScoring ? (
          /* Spinner animation */
          <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          /* Sparkle/star icon (inline SVG to avoid lucide-react issues in Shadow DOM) */
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z" />
          </svg>
        )}

        {/* Scored count badge */}
        {scoredCount > 0 && !isScoring && (
          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {scoredCount}
          </span>
        )}
      </button>
    </div>
  );
}
