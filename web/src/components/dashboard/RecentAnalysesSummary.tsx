'use client'

import { FileText } from 'lucide-react'
import Link from 'next/link'
import { AnalysisSummaryCard } from './AnalysisSummaryCard'
import { useLanguage } from '@/lib/language-context'
import { t } from '@/lib/translations'

interface AnalysisSummary {
  id: string
  listing_id: string
  score: number
  breakdown: {
    match_tier?: string
    listing_title?: string
    listing_address?: string
  } | null
  created_at: string
}

function getTierFromScore(score: number): string {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 40) return 'fair'
  return 'poor'
}

interface RecentAnalysesSummaryProps {
  analyses: AnalysisSummary[]
}

export function RecentAnalysesSummary({ analyses }: RecentAnalysesSummaryProps) {
  const { language } = useLanguage()

  if (analyses.length === 0) return null

  return (
    <div>
      {/* Section heading */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{t(language, 'dashboard_recent_analyses')}</h3>
        </div>
        <Link
          href="/analyses"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t(language, 'dashboard_view_all')} &rarr;
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {analyses.slice(0, 3).map((analysis) => {
          const tier =
            analysis.breakdown?.match_tier ?? getTierFromScore(analysis.score)
          const title = analysis.breakdown?.listing_title ?? null
          const address = analysis.breakdown?.listing_address ?? null

          return (
            <AnalysisSummaryCard
              key={analysis.id}
              id={analysis.id}
              score={analysis.score}
              tier={tier}
              title={title}
              address={address}
            />
          )
        })}
      </div>
    </div>
  )
}
