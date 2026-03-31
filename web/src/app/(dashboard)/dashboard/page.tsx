import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewUserDashboard } from '@/components/dashboard/NewUserDashboard'

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

  if (allProfiles.length === 0) {
    return <NewUserDashboard />
  }

  // Plan 02 will replace this with the returning user dashboard
  return (
    <div>
      {/* Returning user dashboard (Plan 02) */}
      <div>Returning user dashboard (Plan 02)</div>
    </div>
  )
}
