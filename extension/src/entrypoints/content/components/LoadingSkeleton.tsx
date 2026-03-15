/**
 * Loading skeleton shown in badge position while a score is being computed.
 * Rendered inside per-badge Shadow DOM for style isolation.
 * Uses softer colors and matches the polished badge dimensions.
 */
export function LoadingSkeleton() {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl bg-gray-100 animate-pulse px-2.5 py-1.5"
         style={{ width: 100, height: 40 }}>
      <div className="w-7 h-7 rounded-full bg-gray-200" />
      <div className="flex-1 h-3 rounded bg-gray-200" />
    </div>
  );
}
