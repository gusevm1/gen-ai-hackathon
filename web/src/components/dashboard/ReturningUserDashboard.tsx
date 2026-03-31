'use client'

import { ActiveProfileCard } from './ActiveProfileCard'
import { TopMatchesSummary } from './TopMatchesSummary'
import { RecentAnalysesSummary } from './RecentAnalysesSummary'
import { FadeIn } from '@/components/motion/FadeIn'

interface Preferences {
  location?: string | null
  roomsMin?: number | null
  budgetMax?: number | null
  objectCategory?: string | null
  [key: string]: unknown
}

interface Profile {
  id: string
  name: string
  is_default: boolean
  preferences: Preferences
  updated_at: string
}

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

interface ReturningUserDashboardProps {
  profiles: Profile[]
  activeProfile: Profile
  recentAnalyses: AnalysisSummary[]
}

export function ReturningUserDashboard({
  profiles,
  activeProfile,
  recentAnalyses,
}: ReturningUserDashboardProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8 px-4">
      <FadeIn animate="visible" delay={0}>
        <ActiveProfileCard profiles={profiles} activeProfile={activeProfile} />
      </FadeIn>
      <FadeIn animate="visible" delay={0.1}>
        <TopMatchesSummary activeProfileId={activeProfile.id} />
      </FadeIn>
      <FadeIn animate="visible" delay={0.2}>
        <RecentAnalysesSummary analyses={recentAnalyses} />
      </FadeIn>
    </div>
  )
}
