"use client"

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { StaggerGroup, StaggerItem } from '@/components/motion/StaggerGroup'
import { t, type Language } from '@/lib/translations'

function getTierFromScore(score: number): string {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 40) return 'fair'
  return 'poor'
}

// Matches extension TIER_COLORS exactly
const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  excellent: { bg: '#10b981', text: '#ffffff' },
  good:      { bg: '#3b82f6', text: '#ffffff' },
  fair:      { bg: '#f59e0b', text: '#1a1a1a' },
  poor:      { bg: '#ef4444', text: '#ffffff' },
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface AnalysisItem {
  id: string
  listing_id: string
  score: number
  breakdown: {
    match_tier?: string
    listing_title?: string
    listing_address?: string
    listing_rooms?: string
    listing_object_type?: string
  } | null
  profile_id: string | null
  created_at: string
}

interface AnalysesGridProps {
  analyses: AnalysisItem[]
  profileMap: Record<string, string>
  lang: Language
}

export function AnalysesGrid({ analyses, profileMap, lang }: AnalysesGridProps) {
  return (
    <StaggerGroup animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {analyses.map((analysis) => {
        const breakdown = analysis.breakdown as {
          match_tier?: string
          listing_title?: string
          listing_address?: string
          listing_rooms?: string
          listing_object_type?: string
        } | null
        const tier = breakdown?.match_tier ?? getTierFromScore(analysis.score)
        const tierColor = TIER_COLORS[tier] ?? TIER_COLORS.poor
        const profileName = analysis.profile_id ? profileMap[analysis.profile_id] : null
        const tierKey = `tier_${tier}` as 'tier_excellent' | 'tier_good' | 'tier_fair' | 'tier_poor'

        const rawTitle = breakdown?.listing_title
        const constructedTitle = breakdown?.listing_rooms && breakdown?.listing_object_type && breakdown?.listing_address
          ? `${breakdown.listing_rooms} rooms - ${breakdown.listing_object_type.replace(/_/g, ' ').toLowerCase()} - ${breakdown.listing_address.split(' ').pop()}`
          : null
        const primaryTitle = rawTitle || constructedTitle || breakdown?.listing_address || `${t(lang, 'analyses_listing')} ${analysis.listing_id}`

        const secondaryAddress = breakdown?.listing_address && breakdown.listing_address !== primaryTitle
          ? breakdown.listing_address
          : null

        return (
          <StaggerItem key={analysis.id}>
            <Link href={`/analysis/${analysis.listing_id}`}>
              <Card className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/20 hover:-translate-y-1 hover:shadow-lg h-full">
                <CardContent className="flex flex-col gap-3">
                  <div className="flex gap-4 items-start">
                    {/* LEFT: Score circle (matches extension ScoreBadge) */}
                    <div className="shrink-0 flex flex-col items-center gap-1">
                      <span
                        className="inline-flex items-center justify-center rounded-full text-base font-extrabold"
                        style={{ width: 48, height: 48, backgroundColor: tierColor.bg, color: tierColor.text }}
                      >
                        {analysis.score}
                      </span>
                      <span className="text-xs font-semibold capitalize" style={{ color: tierColor.bg }}>
                        {t(lang, tierKey)}
                      </span>
                    </div>
                    {/* RIGHT: Title + address */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground block truncate">
                        {primaryTitle}
                      </span>
                      {secondaryAddress && (
                        <span className="text-xs text-muted-foreground block truncate">
                          {secondaryAddress}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Footer: profile name + date — unchanged */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-1 border-t border-border">
                    {profileName ? (
                      <span className="truncate max-w-[60%]">{profileName}</span>
                    ) : (
                      <span className="text-muted-foreground/50">{t(lang, 'no_profile')}</span>
                    )}
                    <span>{formatDate(analysis.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </StaggerItem>
        )
      })}
    </StaggerGroup>
  )
}
