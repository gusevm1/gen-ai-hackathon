import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileList } from '@/components/profiles/profile-list'

export default async function ProfilesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, is_default, preferences')
    .order('created_at', { ascending: true })

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-2">Profiles</h1>
      <p className="text-muted-foreground mb-6">
        Manage your search profiles. Each profile has its own preferences for scoring listings.
      </p>
      <ProfileList profiles={profiles ?? []} />
    </div>
  )
}
