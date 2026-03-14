'use client'

import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const TIER_COLORS: Record<string, { bg: string; text: string; ring: string; scoreBg: string }> = {
  excellent: { bg: 'bg-emerald-500', text: 'text-white', ring: 'ring-emerald-500/40', scoreBg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  good: { bg: 'bg-blue-500', text: 'text-white', ring: 'ring-blue-500/40', scoreBg: 'bg-blue-50 dark:bg-blue-950/30' },
  fair: { bg: 'bg-amber-500', text: 'text-gray-900', ring: 'ring-amber-500/40', scoreBg: 'bg-amber-50 dark:bg-amber-950/30' },
  poor: { bg: 'bg-gray-500', text: 'text-white', ring: 'ring-gray-500/40', scoreBg: 'bg-gray-50 dark:bg-gray-950/30' },
}

export function getTierColor(tier: string) {
  return TIER_COLORS[tier] ?? TIER_COLORS.poor
}

interface ScoreHeaderProps {
  overallScore: number
  matchTier: string
  listingId: string
  profileName?: string
}

export function ScoreHeader({ overallScore, matchTier, listingId, profileName }: ScoreHeaderProps) {
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

      {/* Listing info row */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>Listing {listingId}</span>
        <span className="text-muted-foreground/40">|</span>
        <a
          href={`https://flatfox.ch/en/flat/-/${listingId}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline transition-colors"
        >
          View on Flatfox
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  )
}
