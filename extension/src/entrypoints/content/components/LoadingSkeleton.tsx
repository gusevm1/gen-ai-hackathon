/**
 * Loading skeleton shown in badge position while a score is being computed.
 * Rendered inside per-badge Shadow DOM for style isolation.
 */
export function LoadingSkeleton() {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-200 animate-pulse px-3 py-1.5"
         style={{ width: 80, height: 32 }}>
      <div className="w-5 h-5 rounded-full bg-gray-300" />
      <div className="flex-1 h-3 rounded bg-gray-300" />
    </div>
  );
}
