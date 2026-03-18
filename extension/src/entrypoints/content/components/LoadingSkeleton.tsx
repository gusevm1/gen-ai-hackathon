/**
 * Loading indicator shown in badge position while a score is being computed.
 * Rendered inside per-badge Shadow DOM for style isolation.
 * Shows a "Scoring..." label with an animated rose progress bar.
 */
export function LoadingSkeleton() {
  return (
    <div
      className="inline-flex flex-col justify-center gap-1 rounded-xl bg-white/90 border border-gray-100 shadow-sm px-3 animate-pulse"
      style={{ width: 110, height: 40 }}
    >
      <span className="text-[10px] text-gray-400 font-medium">Scoring...</span>
      <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
        <div className="h-full rounded-full bg-rose-400" style={{ width: '60%' }} />
      </div>
    </div>
  );
}
