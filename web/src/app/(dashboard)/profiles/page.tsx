import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ProfileList } from '@/components/profiles/profile-list'
import { t, type Language } from '@/lib/translations'

export default async function ProfilesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const cookieStore = await cookies()
  const lang = (cookieStore.get('homematch_lang')?.value ?? 'en') as Language

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, is_default, preferences')
    .order('created_at', { ascending: true })

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-2">{t(lang, 'profiles_title')}</h1>
      <p className="text-muted-foreground mb-6">{t(lang, 'profiles_subtitle')}</p>
      <ProfileList profiles={profiles ?? []} />
    </div>
  )
}
