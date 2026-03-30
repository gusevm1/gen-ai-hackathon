/**
 * Positioned tooltip shown alongside the spotlight cutout during onboarding.
 * Uses inline styles for Shadow DOM isolation (Tailwind host-page classes don't apply).
 */

interface OnboardingTooltipProps {
  rect: DOMRect;
  step: number;
  totalSteps: number;
  title: string;
  instruction: string;
  onNext: () => void;
  onSkip: () => void;
  nextLabel?: string;
  statusMessage?: string | null;
}

const TOOLTIP_WIDTH = 320;
const TOOLTIP_PADDING = 16;
const ARROW_SIZE = 8;

export function OnboardingTooltip({
  rect,
  step,
  totalSteps,
  title,
  instruction,
  onNext,
  onSkip,
  nextLabel = 'Next',
  statusMessage,
}: OnboardingTooltipProps) {
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  // Determine vertical placement: below target by default, above if near bottom
  const spaceBelow = viewportHeight - (rect.bottom + TOOLTIP_PADDING);
  const spaceAbove = rect.top - TOOLTIP_PADDING;
  const placeAbove = spaceBelow < 160 && spaceAbove > spaceBelow;

  // Calculate tooltip left position — center on target, clamp to viewport
  const targetCenter = rect.left + rect.width / 2;
  let tooltipLeft = targetCenter - TOOLTIP_WIDTH / 2;
  tooltipLeft = Math.max(16, Math.min(tooltipLeft, viewportWidth - TOOLTIP_WIDTH - 16));

  const tooltipTop = placeAbove
    ? rect.top - TOOLTIP_PADDING - ARROW_SIZE // will be adjusted after measuring
    : rect.bottom + TOOLTIP_PADDING + ARROW_SIZE;

  // Arrow position relative to tooltip
  const arrowLeft = targetCenter - tooltipLeft - ARROW_SIZE;
  const clampedArrowLeft = Math.max(12, Math.min(arrowLeft, TOOLTIP_WIDTH - 12 - ARROW_SIZE * 2));

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: tooltipLeft,
    top: tooltipTop,
    width: TOOLTIP_WIDTH,
    background: 'white',
    borderRadius: 12,
    padding: '16px 20px 14px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    color: '#1a1a1a',
    zIndex: 100001,
    boxSizing: 'border-box',
  };

  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    left: clampedArrowLeft,
    width: 0,
    height: 0,
    ...(placeAbove
      ? {
          bottom: -ARROW_SIZE,
          borderLeft: `${ARROW_SIZE}px solid transparent`,
          borderRight: `${ARROW_SIZE}px solid transparent`,
          borderTop: `${ARROW_SIZE}px solid white`,
        }
      : {
          top: -ARROW_SIZE,
          borderLeft: `${ARROW_SIZE}px solid transparent`,
          borderRight: `${ARROW_SIZE}px solid transparent`,
          borderBottom: `${ARROW_SIZE}px solid white`,
        }),
  };

  return (
    <div style={tooltipStyle} className="homematch-onboarding-tooltip">
      {/* Arrow caret */}
      <div style={arrowStyle} />

      {/* Title */}
      <h3
        style={{
          fontSize: 15,
          fontWeight: 600,
          margin: '0 0 5px',
          color: '#111',
          lineHeight: 1.3,
        }}
      >
        {title}
      </h3>

      {/* Instruction */}
      <p
        style={{
          fontSize: 13,
          color: '#555',
          margin: '0 0 12px',
          lineHeight: 1.45,
        }}
      >
        {instruction}
      </p>

      {/* Status message (e.g. "Please log in first") */}
      {statusMessage && (
        <p
          style={{
            fontSize: 12,
            color: '#dc2626',
            margin: '-8px 0 10px',
            fontWeight: 500,
          }}
        >
          {statusMessage}
        </p>
      )}

      {/* Footer: progress + actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span
          style={{ fontSize: 11, color: '#aaa', flexShrink: 0 }}
          className="homematch-onboarding-progress"
        >
          Step {step} of {totalSteps}
        </span>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onSkip}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              padding: '5px 10px',
              borderRadius: 6,
            }}
            className="homematch-onboarding-btn homematch-onboarding-btn-ghost"
          >
            Skip
          </button>

          <button
            onClick={onNext}
            style={{
              background: '#2563eb',
              color: 'white',
              border: 'none',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '5px 14px',
              borderRadius: 6,
            }}
            className="homematch-onboarding-btn homematch-onboarding-btn-primary"
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
