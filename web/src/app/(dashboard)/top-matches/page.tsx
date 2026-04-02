'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trophy, RefreshCw, AlertCircle } from 'lucide-react'
import { TopMatchCard } from '@/components/top-matches/TopMatchCard'
import { TopMatchesSkeleton } from '@/components/top-matches/TopMatchesSkeleton'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/language-context'
import { t } from '@/lib/translations'
import { createClient } from '@/lib/supabase/client'
import { recordApplication } from '@/app/(dashboard)/applications/actions'

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

interface QuickApplySharedProps {
  profileId: string
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

export default function TopMatchesPage() {
  const { language } = useLanguage()
  const [data, setData] = useState<TopMatchesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openPanelId, setOpenPanelId] = useState<string | null>(null)
  const [appliedListingIds, setAppliedListingIds] = useState<Set<string>>(new Set())
  const [quickApplyShared, setQuickApplyShared] = useState<QuickApplySharedProps | null>(null)

  const fetchMatches = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/top-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_refresh: forceRefresh }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(err.detail || `Error ${res.status}`)
      }

      const result: TopMatchesData = await res.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load top matches')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch user session, profile, and existing applications
  const fetchUserContext = useCallback(async () => {
    try {
      const supabase = createClient()

      const [sessionResult, userResult] = await Promise.all([
        supabase.auth.getSession(),
        supabase.auth.getUser(),
      ])

      const session = sessionResult.data.session
      const user = userResult.data.user
      if (!session || !user) return

      const authToken = session.access_token

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, phone, preferences')
        .eq('is_default', true)
        .single()

      if (!profile) return

      // Fetch existing applied listings
      const { data: apps } = await supabase
        .from('applications')
        .select('listing_id')
        .eq('profile_id', profile.id)

      if (apps && apps.length > 0) {
        setAppliedListingIds(new Set(apps.map(a => a.listing_id)))
      }

      // Extract top preferences for message generation
      const prefs = profile.preferences as Record<string, unknown> | null ?? {}
      const dynamicFields = (prefs.dynamicFields as Array<{ label: string; importance: string }> | undefined) ?? []
      const keyPreferences = dynamicFields
        .filter(f => ['critical', 'high', 'medium'].includes(f.importance))
        .slice(0, 2)
        .map(f => f.label)

      const moveInIntent = (prefs.moveInDate as string | undefined) ?? ''

      setQuickApplyShared({
        profileId: profile.id,
        profileName: profile.name,
        keyPreferences,
        moveInIntent,
        userName: user.user_metadata?.display_name ?? user.email ?? '',
        userEmail: user.email ?? '',
        userPhone: (profile.phone as string | null) ?? '',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
        authToken,
      })
    } catch {
      // User context failure must not block the page
    }
  }, [])

  useEffect(() => {
    fetchMatches()
    fetchUserContext()
  }, [fetchMatches, fetchUserContext])

  const handleApplied = useCallback(async (listingId: string) => {
    setAppliedListingIds(prev => new Set([...prev, listingId]))
    setOpenPanelId(null)

    if (!quickApplyShared) return
    const match = data?.matches.find(m => String(m.listing_id) === listingId)
    try {
      await recordApplication(
        quickApplyShared.profileId,
        listingId,
        match?.address ?? match?.title ?? '',
        'Wohnung',
        '',
      )
    } catch {
      // Recording failure must not break the UI
    }
  }, [quickApplyShared, data])

  const computedDate = data?.computed_at
    ? new Date(data.computed_at).toLocaleString()
    : null

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{t(language, 'top_matches_title')}</h1>
          </div>
          <p className="text-muted-foreground mt-1">{t(language, 'top_matches_subtitle')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchMatches(true)}
          disabled={loading}
          className="gap-1.5 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t(language, 'top_matches_refresh')}
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <TopMatchesSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex items-center justify-center h-14 w-14 rounded-full bg-destructive/10 mb-4">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold mb-2">{t(language, 'top_matches_error_title')}</h2>
          <p className="text-sm text-muted-foreground max-w-sm mb-4">{error}</p>
          <Button variant="outline" onClick={() => fetchMatches()}>
            {t(language, 'top_matches_try_again')}
          </Button>
        </div>
      ) : data && data.matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex items-center justify-center h-14 w-14 rounded-full bg-muted mb-4">
            <Trophy className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">{t(language, 'top_matches_empty_title')}</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            {t(language, 'top_matches_empty_desc')}
          </p>
        </div>
      ) : data ? (
        <>
          <div className="space-y-4">
            {data.matches.map((match, index) => (
              <TopMatchCard
                key={match.listing_id}
                match={match}
                rank={index}
                defaultExpanded={index === 0}
                isApplied={appliedListingIds.has(String(match.listing_id))}
                quickApplyProps={quickApplyShared ? {
                  profileName: quickApplyShared.profileName,
                  keyPreferences: quickApplyShared.keyPreferences,
                  moveInIntent: quickApplyShared.moveInIntent,
                  userName: quickApplyShared.userName,
                  userEmail: quickApplyShared.userEmail,
                  userPhone: quickApplyShared.userPhone,
                  supabaseUrl: quickApplyShared.supabaseUrl,
                  supabaseAnonKey: quickApplyShared.supabaseAnonKey,
                  authToken: quickApplyShared.authToken,
                } : undefined}
                openPanelId={openPanelId}
                onOpenPanel={(id) => setOpenPanelId(id)}
                onClosePanel={() => setOpenPanelId(null)}
                onApplied={handleApplied}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t(language, 'top_matches_scored_count').replace('{n}', String(data.total_scored))}
            </span>
            {computedDate && <span>{computedDate}</span>}
          </div>
        </>
      ) : null}
    </div>
  )
}
