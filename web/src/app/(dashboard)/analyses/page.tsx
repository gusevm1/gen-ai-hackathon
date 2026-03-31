import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { FileSearch } from 'lucide-react'
import { AnalysesFilterBar } from '@/components/analyses/analyses-filter-bar'
import { t, type Language, LANG_COOKIE } from '@/lib/translations'

function getTierFromScore(score: number): string {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 40) return 'fair'
  return 'poor'
}

const TIER_STYLES: Record<string, { bg: string; text: string }> = {
  excellent: { bg: 'bg-teal-500', text: 'text-white' },
  good: { bg: 'bg-green-500', text: 'text-white' },
  fair: { bg: 'bg-amber-500', text: 'text-gray-900' },
  poor: { bg: 'bg-red-500', text: 'text-white' },
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function AnalysesPage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string; sort?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const params = await searchParams
  const profileFilter = params.profile ?? ''
  const sort = params.sort ?? 'newest'

  const cookieStore = await cookies()
  const lang = (cookieStore.get(LANG_COOKIE)?.value ?? 'en') as Language

  let query = supabase
    .from('analyses')
    .select('id, listing_id, score, breakdown, profile_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: sort === 'oldest' })

  if (profileFilter) {
    query = query.eq('profile_id', profileFilter)
  }

  const { data: analyses } = await query

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name')

  const profileMap = new Map<string, string>()
  if (profiles) {
    for (const p of profiles) {
      profileMap.set(p.id, p.name)
    }
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t(lang, 'analyses_title')}</h1>
        <p className="text-muted-foreground mt-1">{t(lang, 'analyses_subtitle')}</p>
      </div>

      <AnalysesFilterBar
        profiles={profiles ?? []}
        currentProfile={profileFilter}
        currentSort={sort}
        lang={lang}
      />

      {!analyses || analyses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex items-center justify-center h-14 w-14 rounded-full bg-muted mb-4">
            <FileSearch className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">{t(lang, 'analyses_empty_title')}</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            {t(lang, 'analyses_empty_desc')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analyses.map((analysis) => {
            const breakdown = analysis.breakdown as {
              match_tier?: string
              listing_title?: string
              listing_address?: string
              listing_rooms?: string
              listing_object_type?: string
            } | null
            const tier = breakdown?.match_tier ?? getTierFromScore(analysis.score)
            const tierStyle = TIER_STYLES[tier] ?? TIER_STYLES.poor
            const profileName = analysis.profile_id ? profileMap.get(analysis.profile_id) : null
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
              <Link key={analysis.id} href={`/analysis/${analysis.listing_id}`}>
                <Card className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/20 hover:shadow-md h-full">
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 mr-2">
                        <span className="text-sm font-medium text-foreground block truncate">
                          {primaryTitle}
                        </span>
                        {secondaryAddress && (
                          <span className="text-xs text-muted-foreground block truncate">
                            {secondaryAddress}
                          </span>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold shrink-0 ${tierStyle.bg} ${tierStyle.text}`}
                      >
                        {analysis.score}
                      </span>
                    </div>

                    <span className="text-xs text-muted-foreground capitalize">
                      {t(lang, tierKey)}
                    </span>

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
            )
          })}
        </div>
      )}
    </div>
  )
}
