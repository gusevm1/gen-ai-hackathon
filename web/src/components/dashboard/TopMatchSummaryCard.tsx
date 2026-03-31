import { cn } from '@/lib/utils'

const TIER_COLORS: Record<string, string> = {
  excellent: 'bg-teal-500',
  good: 'bg-green-500',
  fair: 'bg-amber-500',
  poor: 'bg-red-500',
}

interface TopMatchSummaryCardProps {
  rank: number
  score: number
  tier: string
  title: string | null
  address: string | null
  slug: string
}

export function TopMatchSummaryCard({
  rank,
  score,
  tier,
  title,
  address,
  slug: _slug,
}: TopMatchSummaryCardProps) {
  const displayText = address || title
  const tierColor = TIER_COLORS[tier.toLowerCase()] ?? 'bg-gray-500'

  return (
    <a
      href="/top-matches"
      className="block rounded-lg border border-border bg-card p-3 hover:border-muted-foreground/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 text-card-foreground"
    >
      {/* Rank badge */}
      <div className="flex items-start justify-between mb-2">
        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-muted text-muted-foreground text-xs font-bold shrink-0">
          #{rank}
        </span>
      </div>

      {/* Score circle */}
      <div className="flex flex-col items-center gap-1 mb-2">
        <div
          className={cn(
            'h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm',
            tierColor
          )}
        >
          {Math.round(score)}
        </div>
      </div>

      {/* Address / title */}
      {displayText && (
        <p className="text-xs text-muted-foreground truncate text-center">{displayText}</p>
      )}

      {/* Tier label */}
      <p className="text-xs text-center capitalize mt-1 font-medium">{tier}</p>
    </a>
  )
}
