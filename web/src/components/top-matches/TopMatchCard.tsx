'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, MapPin, Ruler, DoorOpen, Banknote } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BulletSummary } from '@/components/analysis/BulletSummary'
import { FulfillmentBreakdown } from '@/components/analysis/FulfillmentBreakdown'
import { QuickApplyPanel } from '@/components/quick-apply/QuickApplyPanel'
import type { CriterionResult } from '@/lib/fulfillment-utils'
import { useLanguage } from '@/lib/language-context'
import { t } from '@/lib/translations'

const TIER_COLORS: Record<string, { bg: string; text: string; ring: string; scoreBg: string }> = {
  excellent: { bg: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-700 dark:text-teal-400', ring: 'ring-teal-200 dark:ring-teal-800', scoreBg: 'bg-teal-500' },
  good: { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-400', ring: 'ring-green-200 dark:ring-green-800', scoreBg: 'bg-green-500' },
  fair: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', ring: 'ring-amber-200 dark:ring-amber-800', scoreBg: 'bg-amber-500' },
  poor: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400', ring: 'ring-red-200 dark:ring-red-800', scoreBg: 'bg-red-500' },
}

const RANK_COLORS = [
  'bg-yellow-500 text-white',    // #1
  'bg-gray-400 text-white',      // #2
  'bg-amber-700 text-white',     // #3
  'bg-slate-500 text-white',     // #4
  'bg-slate-500 text-white',     // #5
]

interface TopMatchCardProps {
  match: {
    listing_id: number
    slug: string
    title: string | null
    address: string | null
    city: string | null
    rooms: number | null
    sqm: number | null
    price: number | null
    image_url: string | null
    score_response: {
      overall_score: number
      match_tier: string
      summary_bullets: string[]
      criteria_results: CriterionResult[]
    }
  }
  rank: number
  defaultExpanded?: boolean
  isApplied?: boolean
  quickApplyProps?: {
    profileName: string
    keyPreferences: string[]
    moveInIntent: string
    userName: string
    userEmail: string
    userPhone: string
    supabaseUrl: string
    supabaseAnonKey: string
    authToken: string
  }
  openPanelId: string | null
  onOpenPanel: (listingId: string) => void
  onClosePanel: () => void
  onApplied: (listingId: string) => void
}

export function TopMatchCard({
  match,
  rank,
  defaultExpanded = false,
  isApplied,
  quickApplyProps,
  openPanelId,
  onOpenPanel,
  onClosePanel,
  onApplied,
}: TopMatchCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const { language } = useLanguage()
  const tier = match.score_response.match_tier
  const colors = TIER_COLORS[tier] ?? TIER_COLORS.poor
  const tierKey = `tier_${tier}` as 'tier_excellent' | 'tier_good' | 'tier_fair' | 'tier_poor'

  const displayTitle = match.title || match.address || `Listing ${match.listing_id}`
  const flatfoxUrl = match.slug ? `https://flatfox.ch/en/flat/${match.slug}/${match.listing_id}/` : null

  return (
    <Card className={`ring-1 ${colors.ring} transition-all hover:-translate-y-1 hover:shadow-lg`}>
      <CardContent className="space-y-3">
        {/* Header row: rank + title + score */}
        <div className="flex items-start gap-3">
          <div className={`flex items-center justify-center h-10 w-10 rounded-full text-sm font-bold shrink-0 ${RANK_COLORS[rank] ?? RANK_COLORS[4]}`}>
            #{rank + 1}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold truncate">{displayTitle}</h3>
            {match.address && match.address !== match.title && (
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" />
                {match.address}{match.city ? `, ${match.city}` : ''}
              </p>
            )}
          </div>
          <div className="flex flex-col items-center shrink-0">
            <div className={`flex items-center justify-center h-12 w-12 rounded-full text-white font-bold text-lg ${colors.scoreBg}`}>
              {match.score_response.overall_score}
            </div>
            <span className={`text-[10px] font-medium capitalize mt-1 ${colors.text}`}>
              {t(language, tierKey)}
            </span>
          </div>
        </div>

        {/* Metadata pills */}
        <div className="flex flex-wrap gap-2">
          {match.price != null && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Banknote className="h-3 w-3" />
              CHF {match.price.toLocaleString()}
            </Badge>
          )}
          {match.rooms != null && (
            <Badge variant="secondary" className="text-xs gap-1">
              <DoorOpen className="h-3 w-3" />
              {match.rooms} {t(language, 'profile_rooms')}
            </Badge>
          )}
          {match.sqm != null && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Ruler className="h-3 w-3" />
              {match.sqm} m²
            </Badge>
          )}
        </div>

        {/* Expand/collapse + Flatfox link */}
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? t(language, 'top_matches_hide_details') : t(language, 'top_matches_show_details')}
          </button>
          {flatfoxUrl && (
            <a
              href={flatfoxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Flatfox <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="space-y-4 pt-2">
            <BulletSummary bullets={match.score_response.summary_bullets} />
            <FulfillmentBreakdown criteriaResults={match.score_response.criteria_results} />
          </div>
        )}

        {/* Quick Apply section */}
        {quickApplyProps && (
          <div className="pt-2 border-t border-border">
            {isApplied ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                Applied
              </span>
            ) : openPanelId === String(match.listing_id) ? (
              <QuickApplyPanel
                listingId={String(match.listing_id)}
                listingAddress={match.address ?? match.title ?? ''}
                listingType="Wohnung"
                onApplied={() => onApplied(String(match.listing_id))}
                onDismiss={onClosePanel}
                {...quickApplyProps}
              />
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={() => onOpenPanel(String(match.listing_id))}
              >
                Quick Apply
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
