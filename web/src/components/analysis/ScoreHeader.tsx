'use client'

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  excellent: { bg: 'bg-emerald-500', text: 'text-white' },
  good: { bg: 'bg-blue-500', text: 'text-white' },
  fair: { bg: 'bg-amber-500', text: 'text-gray-900' },
  poor: { bg: 'bg-gray-500', text: 'text-white' },
}

export function getTierColor(tier: string) {
  return TIER_COLORS[tier] ?? TIER_COLORS.poor
}

interface ScoreHeaderProps {
  overallScore: number
  matchTier: string
  listingId: string
}

export function ScoreHeader({ overallScore, matchTier, listingId }: ScoreHeaderProps) {
  const colors = getTierColor(matchTier)

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      {/* Score circle */}
      <div
        className={`flex items-center justify-center rounded-full ${colors.bg} ${colors.text}`}
        style={{ width: 80, height: 80 }}
      >
        <span className="text-2xl font-bold">{overallScore}</span>
      </div>

      {/* Match tier badge */}
      <span
        className={`inline-block rounded-full px-4 py-1 text-sm font-semibold capitalize ${colors.bg} ${colors.text}`}
      >
        {matchTier}
      </span>

      {/* Listing info */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Listing {listingId}</p>
        <a
          href={`https://flatfox.ch/en/flat/-/${listingId}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          View on Flatfox
        </a>
      </div>
    </div>
  )
}
