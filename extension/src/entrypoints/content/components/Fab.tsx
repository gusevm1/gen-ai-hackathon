import { useEffect, useState, useCallback, useRef } from 'react';

const BRAND_COLOR = 'hsl(342, 89%, 40%)';
const BRAND_COLOR_HOVER = 'hsl(342, 89%, 34%)';

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
  const [isHovered, setIsHovered] = useState(false);
  const [buttonBg, setButtonBg] = useState(BRAND_COLOR);
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

  const showLongPressHint = isHovered && scoredCount > 0 && !isScoring && longPressProgress === 0;

  return (
    <div className="fixed bottom-6 right-6 z-[999999] flex flex-col items-end gap-2">
      {/* Error tooltip */}
      {showError && error && (
        <div className="bg-red-50 backdrop-blur-sm border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 max-w-xs shadow-lg">
          {error}
        </div>
      )}

      {/* Long-press hint tooltip — shown above button when hovering over an already-scored page */}
      {showLongPressHint && (
        <div
          className="rounded-lg px-3 py-1.5 text-xs font-medium shadow-md border whitespace-nowrap"
          style={{
            color: BRAND_COLOR,
            backgroundColor: 'hsl(342, 89%, 97%)',
            borderColor: 'hsl(342, 89%, 85%)',
          }}
        >
          Long press 2–3 s to hard rescore
        </div>
      )}

      {/* FAB button */}
      <button
        onPointerDown={startLongPress}
        onPointerUp={handlePointerUp}
        onPointerLeave={(e) => { cancelLongPress(); setIsHovered(false); setButtonBg(BRAND_COLOR); }}
        onPointerEnter={() => { setIsHovered(true); setButtonBg(BRAND_COLOR_HOVER); }}
        onMouseEnter={() => { setIsHovered(true); setButtonBg(BRAND_COLOR_HOVER); }}
        onMouseLeave={() => { setIsHovered(false); setButtonBg(BRAND_COLOR); }}
        onContextMenu={(e) => e.preventDefault()}
        disabled={isScoring}
        className="relative w-14 h-14 rounded-full text-white shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
        style={{ backgroundColor: buttonBg }}
        aria-label="Score listings with HomeMatch"
      >
        {isScoring ? (
          /* Spinner animation */
          <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          /* House/home icon */
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        )}

        {/* Circular progress ring for long-press — black for visibility */}
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
              stroke="rgba(0, 0, 0, 0.75)"
              strokeWidth="3.5"
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
