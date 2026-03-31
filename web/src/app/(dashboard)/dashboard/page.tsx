import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewUserDashboard } from '@/components/dashboard/NewUserDashboard'
import { ReturningUserDashboard } from '@/components/dashboard/ReturningUserDashboard'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, is_default, preferences, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const allProfiles = profiles ?? []
  const activeProfile =
    allProfiles.find((p) => p.is_default) ?? allProfiles[0] ?? null

  if (allProfiles.length === 0 || !activeProfile) {
    return <NewUserDashboard />
  }

  const { data: recentAnalyses } = await supabase
    .from('analyses')
    .select('id, listing_id, score, breakdown, created_at')
    .eq('profile_id', activeProfile.id)
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <ReturningUserDashboard
      profiles={allProfiles}
      activeProfile={activeProfile}
      recentAnalyses={recentAnalyses ?? []}
    />
  )
}
