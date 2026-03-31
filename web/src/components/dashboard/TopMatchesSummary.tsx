'use client'

import { useState, useEffect } from 'react'
import { Trophy, ExternalLink } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { TopMatchSummaryCard } from './TopMatchSummaryCard'
import { useLanguage } from '@/lib/language-context'
import { t } from '@/lib/translations'
import Link from 'next/link'

interface TopMatch {
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
    criteria_results: Array<{
      criterion_name: string
      fulfillment: number | null
      importance: string
      weight: number
      reasoning: string | null
    }>
  }
}

interface TopMatchesData {
  matches: TopMatch[]
  total_scored: number
  computed_at: string
}

interface TopMatchesSummaryProps {
  activeProfileId: string
}

export function TopMatchesSummary({ activeProfileId }: TopMatchesSummaryProps) {
  const { language } = useLanguage()
  const [data, setData] = useState<TopMatchesData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setData(null)

    fetch('/api/top-matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force_refresh: false }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load')
        return res.json() as Promise<TopMatchesData>
      })
      .then((result) => {
        setData(result)
      })
      .catch(() => {
        // Silently fail — dashboard shouldn't break on top-matches error
        setData(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [activeProfileId])

  const top3 = data?.matches.slice(0, 3) ?? []
  const computedAt = data?.computed_at
    ? new Date(data.computed_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div>
      {/* Section heading */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{t(language, 'dashboard_top_matches')}</h3>
        </div>
        <Link
          href="/top-matches"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t(language, 'dashboard_view_all')} &rarr;
        </Link>
      </div>

      {loading ? (
        /* Skeleton loading state */
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : top3.length === 0 ? (
        /* Empty state */
        <div className="rounded-lg border border-border bg-muted/40 p-6 text-center">
          <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            {t(language, 'dashboard_top_matches_empty')}
          </p>
          <a
            href="https://flatfox.ch/en/search/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Open Flatfox <ExternalLink className="size-3.5" />
          </a>
        </div>
      ) : (
        /* Match cards */
        <>
          <div className="grid grid-cols-3 gap-3">
            {top3.map((match, index) => (
              <TopMatchSummaryCard
                key={match.listing_id}
                rank={index + 1}
                score={match.score_response.overall_score}
                tier={match.score_response.match_tier}
                title={match.title}
                address={match.address}
                slug={match.slug}
              />
            ))}
          </div>
          {computedAt && (
            <p className="text-xs text-muted-foreground mt-2">
              {t(language, 'dashboard_top_matches_updated')}: {computedAt}
            </p>
          )}
        </>
      )}
    </div>
  )
}
