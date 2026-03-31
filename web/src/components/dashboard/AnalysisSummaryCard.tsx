import Link from 'next/link'
import { cn } from '@/lib/utils'

const TIER_COLORS: Record<string, string> = {
  excellent: 'bg-teal-500',
  good: 'bg-green-500',
  fair: 'bg-amber-500',
  poor: 'bg-red-500',
}

interface AnalysisSummaryCardProps {
  id: string
  score: number
  tier: string
  title: string | null
  address: string | null
}

export function AnalysisSummaryCard({
  id: _id,
  score,
  tier,
  title,
  address,
}: AnalysisSummaryCardProps) {
  const displayText = address || title
  const tierColor = TIER_COLORS[tier.toLowerCase()] ?? 'bg-gray-500'

  return (
    <Link
      href="/analyses"
      className="block rounded-lg border border-border bg-card p-3 hover:border-muted-foreground/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 text-card-foreground"
    >
      <div className="flex items-center gap-3">
        {/* Score circle */}
        <div
          className={cn(
            'h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0',
            tierColor
          )}
        >
          {Math.round(score)}
        </div>

        {/* Info */}
        <div className="min-w-0">
          {displayText && (
            <p className="text-sm font-medium truncate">{displayText}</p>
          )}
          <p className="text-xs text-muted-foreground capitalize mt-0.5">{tier}</p>
        </div>
      </div>
    </Link>
  )
}
