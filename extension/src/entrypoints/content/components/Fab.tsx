import { useEffect, useState, useCallback, useRef } from 'react';

interface FabProps {
  onClick: () => void;
  onLongPress: () => void;
  isScoring: boolean;
  scoredCount: number;
  error: string | null;
}

/**
 * Floating Action Button for triggering listing scoring.
 * Positioned bottom-right via the Shadow DOM overlay.
 * Uses Tailwind classes (inside Shadow DOM, styles are isolated).
 *
 * Supports long-press (2-second hold) with circular progress ring
 * to trigger force re-score. Regular tap uses cached scores.
 */
export function Fab({ onClick, onLongPress, isScoring, scoredCount, error }: FabProps) {
  const [showError, setShowError] = useState(false);
  const [longPressProgress, setLongPressProgress] = useState(0);
  const longPressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const longPressFiredRef = useRef(false);
  const LONG_PRESS_DURATION = 2000; // 2 seconds
  const TICK_INTERVAL = 50; // Update progress every 50ms

  const startLongPress = useCallback(() => {
    if (isScoring) return;
    longPressFiredRef.current = false;
    setLongPressProgress(0);
    let elapsed = 0;

    longPressTimerRef.current = setInterval(() => {
      elapsed += TICK_INTERVAL;
      const progress = Math.min(elapsed / LONG_PRESS_DURATION, 1);
      setLongPressProgress(progress);

      if (progress >= 1) {
        // Auto-fire on completion
        clearInterval(longPressTimerRef.current!);
        longPressTimerRef.current = null;
        longPressFiredRef.current = true;
        setLongPressProgress(0);
        onLongPress();
      }
    }, TICK_INTERVAL);
  }, [isScoring, onLongPress]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearInterval(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setLongPressProgress(0);
  }, []);

  const handlePointerUp = useCallback(() => {
    cancelLongPress();
    // Only fire click if long press didn't fire
    if (!longPressFiredRef.current && !isScoring) {
      onClick();
    }
  }, [cancelLongPress, onClick, isScoring]);

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
        <div className="bg-red-50 backdrop-blur-sm border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 max-w-xs shadow-lg">
          {error}
        </div>
      )}

      {/* FAB button */}
      <button
        onPointerDown={startLongPress}
        onPointerUp={handlePointerUp}
        onPointerLeave={cancelLongPress}
        onContextMenu={(e) => e.preventDefault()}
        disabled={isScoring}
        className="relative w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl hover:shadow-2xl hover:ring-2 hover:ring-emerald-300/50 transition-all duration-200 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
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

        {/* Circular progress ring for long-press */}
        {longPressProgress > 0 && (
          <svg
            className="absolute inset-0 w-14 h-14 -rotate-90 pointer-events-none"
            viewBox="0 0 56 56"
          >
            <circle
              cx="28"
              cy="28"
              r="25"
              fill="none"
              stroke="rgba(16, 185, 129, 0.4)"
              strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 25}`}
              strokeDashoffset={`${2 * Math.PI * 25 * (1 - longPressProgress)}`}
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Scored count badge */}
        {scoredCount > 0 && !isScoring && (
          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[11px] font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {scoredCount}
          </span>
        )}
      </button>
    </div>
  );
}
