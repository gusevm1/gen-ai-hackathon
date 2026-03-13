export default function AnalysisLoading() {
  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      {/* Back link placeholder */}
      <div className="mb-6 h-4 w-32 animate-pulse rounded bg-muted" />

      {/* Score header skeleton */}
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="h-20 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      </div>

      {/* Bullets skeleton */}
      <div className="mt-8 rounded-lg border border-border bg-card p-6">
        <div className="mb-4 h-5 w-28 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
        </div>
      </div>

      {/* Category bars skeleton */}
      <div className="mt-8 space-y-4">
        <div className="mb-4 h-5 w-44 animate-pulse rounded bg-muted" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-12 animate-pulse rounded bg-muted" />
            </div>
            <div className="mb-2 h-2.5 w-full animate-pulse rounded-full bg-muted" />
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
