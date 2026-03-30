/**
 * Full-viewport spotlight overlay using an SVG mask to cut out the target element.
 * Renders inside the extension's Shadow DOM root.
 *
 * The SVG dark overlay blocks the page except for a rounded-rect cutout over the target.
 * The cutout area has pointer-events passthrough so the user can interact with the element.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { OnboardingTooltip } from './OnboardingTooltip';

interface OnboardingOverlayProps {
  /** CSS selector for the target on the host page DOM. */
  targetSelector?: string | null;
  /** Tag name of a shadow host element (e.g. 'homematch-fab') for FAB targeting. */
  targetShadowHost?: string | null;
  step: number;
  totalSteps: number;
  title: string;
  instruction: string;
  onNext: () => void;
  onSkip: () => void;
  nextLabel?: string;
  statusMessage?: string | null;
}

const CUTOUT_PADDING = 8;

function getTargetRect(
  targetSelector?: string | null,
  targetShadowHost?: string | null,
): DOMRect | null {
  if (targetShadowHost) {
    const host = document.querySelector(targetShadowHost);
    if (host) return host.getBoundingClientRect();
  }
  if (targetSelector) {
    const el = document.querySelector(targetSelector);
    if (el) return el.getBoundingClientRect();
  }
  return null;
}

/** Fallback rect at top-right of viewport (for extension icon area, step 4 no DOM target). */
function getExtensionIconFallbackRect(): DOMRect {
  const size = 36;
  const right = window.innerWidth - 16;
  const top = 16;
  return new DOMRect(right - size, top, size, size);
}

export function OnboardingOverlay({
  targetSelector,
  targetShadowHost,
  step,
  totalSteps,
  title,
  instruction,
  onNext,
  onSkip,
  nextLabel,
  statusMessage,
}: OnboardingOverlayProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);

  const updateRect = useCallback(() => {
    const target = getTargetRect(targetSelector, targetShadowHost);
    if (target) {
      // Scroll into view the first time we find the element
      if (targetShadowHost) {
        const host = document.querySelector(targetShadowHost);
        host?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (targetSelector) {
        const el = document.querySelector(targetSelector);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setRect(target);
    } else {
      // No DOM target — use fallback position (extension icon area)
      setRect(getExtensionIconFallbackRect());
    }
  }, [targetSelector, targetShadowHost]);

  useEffect(() => {
    updateRect();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(updateRect);
      }, 100);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updateRect]);

  if (!rect) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const cutout = {
    x: rect.left - CUTOUT_PADDING,
    y: rect.top - CUTOUT_PADDING,
    w: rect.width + CUTOUT_PADDING * 2,
    h: rect.height + CUTOUT_PADDING * 2,
    rx: 8,
  };

  return (
    <div
      className="homematch-onboarding-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        // Allow pointer events on the overlay container itself
        pointerEvents: 'auto',
      }}
    >
      {/* SVG mask: dark overlay with cutout over target */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          // SVG itself has no pointer events — individual elements opt in
          pointerEvents: 'none',
        }}
        width={vw}
        height={vh}
      >
        <defs>
          <mask id="homematch-spotlight-mask">
            {/* White = show overlay color */}
            <rect width="100%" height="100%" fill="white" />
            {/* Black = transparent (show through to page) */}
            <rect
              x={cutout.x}
              y={cutout.y}
              width={cutout.w}
              height={cutout.h}
              rx={cutout.rx}
              fill="black"
            />
          </mask>
        </defs>

        {/* The semi-transparent dark layer applied through the mask */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.52)"
          mask="url(#homematch-spotlight-mask)"
          style={{ pointerEvents: 'auto' }}
        />
      </svg>

      {/* Transparent passthrough div over the cutout — lets clicks reach the target */}
      <div
        style={{
          position: 'fixed',
          left: cutout.x,
          top: cutout.y,
          width: cutout.w,
          height: cutout.h,
          borderRadius: cutout.rx,
          pointerEvents: 'none',
          zIndex: 100000,
        }}
      />

      {/* Tooltip */}
      <OnboardingTooltip
        rect={rect}
        step={step}
        totalSteps={totalSteps}
        title={title}
        instruction={instruction}
        onNext={onNext}
        onSkip={onSkip}
        nextLabel={nextLabel}
        statusMessage={statusMessage}
      />
    </div>
  );
}
