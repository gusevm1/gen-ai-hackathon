import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ScoreHeader } from '@/components/analysis/ScoreHeader'
import { BulletSummary } from '@/components/analysis/BulletSummary'
import { CategoryBreakdown } from '@/components/analysis/CategoryBreakdown'
import { ChecklistSection } from '@/components/analysis/ChecklistSection'
import { FulfillmentBreakdown } from '@/components/analysis/FulfillmentBreakdown'
import { PropertyMapView } from '@/components/analysis/PropertyMapView'
import { FadeIn } from '@/components/motion/FadeIn'
import { deriveFulfillmentChecklist } from '@/lib/fulfillment-utils'
import type { CriterionResult } from '@/lib/fulfillment-utils'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface AnalysisPageProps {
  params: Promise<{ listingId: string }>
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!analysis) {
    return (
      <div className="container max-w-4xl mx-auto py-16 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">No analysis found</h1>
        <p className="text-muted-foreground mb-6">
          We could not find an analysis for listing {listingId}. It may not have been scored yet.
        </p>
        <Link
          href="/analyses"
          className="text-blue-600 hover:underline"
        >
          Back to Analyses
        </Link>
      </div>
    )
  }

  // Fetch profile name if available
  let profileName: string | undefined
  if (analysis.profile_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', analysis.profile_id)
      .single()
    if (profile) {
      profileName = profile.name
    }
  }

  // Fetch listing location for map view
  let listingLocation: { address: string; latitude: number | null; longitude: number | null } | null = null
  const { data: listingProfile } = await supabase
    .from('listing_profiles')
    .select('address, latitude, longitude')
    .eq('listing_id', parseInt(listingId, 10))
    .maybeSingle()

  if (listingProfile?.address) {
    listingLocation = {
      address: listingProfile.address,
      latitude: listingProfile.latitude ?? null,
      longitude: listingProfile.longitude ?? null,
    }
  }

  const breakdown = analysis.breakdown as {
    overall_score?: number
    match_tier?: string
    summary_bullets?: string[]
    listing_title?: string
    categories?: Array<{
      name: string
      score: number
      weight: number
      reasoning: string[]
    }>
    checklist?: Array<{
      criterion: string
      met: boolean | null | "partial"
      note: string
    }>
    schema_version?: number
    criteria_results?: CriterionResult[]
    enrichment_status?: string
  }

  const overallScore = breakdown.overall_score ?? analysis.score ?? 0
  const matchTier = breakdown.match_tier ?? 'poor'
  const summaryBullets = breakdown.summary_bullets ?? []
  const categories = breakdown.categories ?? []
  const checklist = breakdown.checklist ?? []
  const listingTitle = breakdown.listing_title ?? null
  const schemaVersion = (breakdown.schema_version as number) ?? 1
  const criteriaResults = (breakdown.criteria_results ?? []) as CriterionResult[]

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/analyses" className="hover:text-foreground transition-colors">
          Analyses
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{listingTitle ?? `Listing ${listingId}`}</span>
      </nav>

      <h1 className="sr-only">Analysis - {listingTitle ?? `Listing ${listingId}`}</h1>

      {/* Score header full width */}
      <ScoreHeader
        overallScore={overallScore}
        matchTier={matchTier}
        listingId={listingId}
        listingTitle={listingTitle}
        profileName={profileName}
      />

      {/* Timestamp */}
      <p className="text-center text-xs text-muted-foreground -mt-4 mb-8">
        Scored on {formatDate(analysis.created_at)}
      </p>

      {/* 2-column layout on lg screens */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Left column: Key Takeaways + Breakdown (v1: categories, v2: fulfillment) */}
        <div className="space-y-8">
          <BulletSummary bullets={summaryBullets} />
          {schemaVersion >= 2 ? (
            <FulfillmentBreakdown criteriaResults={criteriaResults} />
          ) : (
            <CategoryBreakdown categories={categories} />
          )}
        </div>

        {/* Right column: Checklist (v2: derived from fulfillment, v1: legacy) */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          {schemaVersion >= 2 ? (
            <ChecklistSection checklist={deriveFulfillmentChecklist(criteriaResults)} />
          ) : (
            <ChecklistSection checklist={checklist} />
          )}
        </div>
      </div>

      {/* Property location map — only when listing_profiles data available */}
      {listingLocation && (
        <FadeIn className="mt-8">
          <PropertyMapView
            address={listingLocation.address}
            latitude={listingLocation.latitude}
            longitude={listingLocation.longitude}
          />
        </FadeIn>
      )}
    </div>
  )
}
