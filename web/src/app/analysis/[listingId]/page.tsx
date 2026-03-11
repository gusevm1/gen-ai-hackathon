import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ScoreHeader } from '@/components/analysis/ScoreHeader'
import { BulletSummary } from '@/components/analysis/BulletSummary'
import { CategoryBreakdown } from '@/components/analysis/CategoryBreakdown'
import { ChecklistSection } from '@/components/analysis/ChecklistSection'
import Link from 'next/link'

interface AnalysisPageProps {
  params: Promise<{ listingId: string }>
}

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const { listingId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: analysis } = await supabase
    .from('analyses')
    .select('*')
    .eq('user_id', user.id)
    .eq('listing_id', listingId)
    .single()

  if (!analysis) {
    return (
      <div className="container max-w-2xl mx-auto py-16 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">No analysis found</h1>
        <p className="text-muted-foreground mb-6">
          We could not find an analysis for listing {listingId}. It may not have been scored yet.
        </p>
        <Link
          href="/dashboard"
          className="text-blue-600 hover:underline"
        >
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const breakdown = analysis.breakdown as {
    overall_score?: number
    match_tier?: string
    summary_bullets?: string[]
    categories?: Array<{
      name: string
      score: number
      weight: number
      reasoning: string[]
    }>
    checklist?: Array<{
      criterion: string
      met: boolean | null
      note: string
    }>
  }

  const overallScore = breakdown.overall_score ?? analysis.score ?? 0
  const matchTier = breakdown.match_tier ?? 'poor'
  const summaryBullets = breakdown.summary_bullets ?? []
  const categories = breakdown.categories ?? []
  const checklist = breakdown.checklist ?? []

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Link
        href="/dashboard"
        className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to Dashboard
      </Link>

      <h1 className="sr-only">Analysis - Listing {listingId}</h1>

      <ScoreHeader
        overallScore={overallScore}
        matchTier={matchTier}
        listingId={listingId}
      />

      <div className="mt-8 space-y-8">
        <BulletSummary bullets={summaryBullets} />
        <CategoryBreakdown categories={categories} />
        <ChecklistSection checklist={checklist} />
      </div>
    </div>
  )
}
