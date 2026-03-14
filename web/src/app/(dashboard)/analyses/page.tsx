import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { FileSearch } from 'lucide-react'

function getTierFromScore(score: number): string {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 40) return 'fair'
  return 'poor'
}

const TIER_STYLES: Record<string, { bg: string; text: string }> = {
  excellent: { bg: 'bg-emerald-500', text: 'text-white' },
  good: { bg: 'bg-blue-500', text: 'text-white' },
  fair: { bg: 'bg-amber-500', text: 'text-gray-900' },
  poor: { bg: 'bg-gray-500', text: 'text-white' },
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function AnalysesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: analyses } = await supabase
    .from('analyses')
    .select('id, listing_id, score, breakdown, profile_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch profiles for name lookup
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Analyses</h1>
        <p className="text-muted-foreground mt-1">Your scored listings</p>
      </div>

      {!analyses || analyses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex items-center justify-center h-14 w-14 rounded-full bg-muted mb-4">
            <FileSearch className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">No analyses yet</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Score listings on Flatfox using the browser extension to see results here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analyses.map((analysis) => {
            const breakdown = analysis.breakdown as { match_tier?: string } | null
            const tier = breakdown?.match_tier ?? getTierFromScore(analysis.score)
            const tierStyle = TIER_STYLES[tier] ?? TIER_STYLES.poor
            const profileName = analysis.profile_id ? profileMap.get(analysis.profile_id) : null

            return (
              <Link key={analysis.id} href={`/analysis/${analysis.listing_id}`}>
                <Card className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/20 hover:shadow-md h-full">
                  <CardContent className="flex flex-col gap-3">
                    {/* Score badge + listing ID */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground truncate">
                        Listing {analysis.listing_id}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${tierStyle.bg} ${tierStyle.text}`}
                      >
                        {analysis.score}
                      </span>
                    </div>

                    {/* Tier label */}
                    <span className="text-xs text-muted-foreground capitalize">
                      {tier} match
                    </span>

                    {/* Footer: profile + date */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-1 border-t border-border">
                      {profileName ? (
                        <span className="truncate max-w-[60%]">{profileName}</span>
                      ) : (
                        <span className="text-muted-foreground/50">No profile</span>
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
