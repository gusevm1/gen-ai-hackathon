'use client'

import { Card, CardContent } from '@/components/ui/card'

function SkeletonCard({ index }: { index: number }) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-4">
          {/* Rank badge skeleton */}
          <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
          </div>
          {/* Score circle skeleton */}
          <div className="h-12 w-12 rounded-full bg-muted animate-pulse shrink-0" />
        </div>
        <div className="flex gap-3">
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
          <div className="h-4 w-16 bg-muted animate-pulse rounded" />
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-3 w-full bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  )
}

export function TopMatchesSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }, (_, i) => (
        <SkeletonCard key={i} index={i} />
      ))}
    </div>
  )
}
