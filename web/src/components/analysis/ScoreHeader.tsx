'use client'

import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const TIER_COLORS: Record<string, { bg: string; text: string; ring: string; scoreBg: string }> = {
  excellent: { bg: 'bg-teal-500', text: 'text-white', ring: 'ring-teal-500/40', scoreBg: 'bg-teal-50 dark:bg-teal-950/30' },
  good: { bg: 'bg-green-500', text: 'text-white', ring: 'ring-green-500/40', scoreBg: 'bg-green-50 dark:bg-green-950/30' },
  fair: { bg: 'bg-amber-500', text: 'text-gray-900', ring: 'ring-amber-500/40', scoreBg: 'bg-amber-50 dark:bg-amber-950/30' },
  poor: { bg: 'bg-red-500', text: 'text-white', ring: 'ring-red-500/40', scoreBg: 'bg-red-50 dark:bg-red-950/30' },
}

export function getTierColor(tier: string) {
  return TIER_COLORS[tier] ?? TIER_COLORS.poor
}

interface ScoreHeaderProps {
  overallScore: number
  matchTier: string
  listingId: string
  listingTitle?: string | null
  profileName?: string
}

export function ScoreHeader({ overallScore, matchTier, listingId, listingTitle, profileName }: ScoreHeaderProps) {
  const colors = getTierColor(matchTier)

  return (
    <div className="flex flex-col items-center gap-5 py-10">
      {/* Score circle with ring effect */}
      <div
        className={`relative flex items-center justify-center rounded-full ${colors.bg} ${colors.text} shadow-lg ring-4 ${colors.ring}`}
        style={{ width: 120, height: 120 }}
      >
        <div className="flex flex-col items-center">
          <span className="text-4xl font-bold leading-none">{overallScore}</span>
          <span className="text-sm font-medium opacity-80">/100</span>
        </div>
      </div>

      {/* Tier badge */}
      <span
        className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${colors.bg} ${colors.text} shadow-sm`}
      >
        {matchTier} Match
      </span>

      {/* Profile name */}
      {profileName && (
        <Badge variant="secondary" className="text-xs">
          Profile: {profileName}
        </Badge>
      )}

      {/* Listing title / ID */}
      <p className="text-base font-medium text-foreground text-center max-w-md">
        {listingTitle ?? `Listing ${listingId}`}
      </p>

      {/* View on Flatfox — prominent button */}
      <a
        href={`https://flatfox.ch/en/flat/-/${listingId}/`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-primary px-4 py-1.5 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        View on Flatfox
      </a>
    </div>
  )
}
