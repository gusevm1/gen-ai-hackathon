import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { preferencesSchema, migratePreferences } from '@/lib/schemas/preferences'
import { saveProfilePreferences } from '@/app/(dashboard)/profiles/actions'
import { PreferencesForm } from '@/components/preferences/preferences-form'

interface EditProfilePageProps {
  params: Promise<{ profileId: string }>
}

export default async function EditProfilePage({ params }: EditProfilePageProps) {
  const { profileId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, name, preferences')
    .eq('id', profileId)
    .single()

  if (error || !profile) {
    redirect('/profiles')
  }

  const defaults = preferencesSchema.parse(migratePreferences((profile.preferences ?? {}) as Record<string, unknown>))
  const id = profile.id

  async function handleSave(data: Parameters<typeof saveProfilePreferences>[1]) {
    'use server'
    await saveProfilePreferences(id, data)
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Link
        href="/profiles"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Profiles
      </Link>
      <h1 className="text-2xl font-bold mb-2">{profile.name}</h1>
      <p className="text-muted-foreground mb-8">
        Edit preferences for this profile. These will be used to score listings on Flatfox.
      </p>
      <PreferencesForm
        defaultValues={defaults}
        onSave={handleSave}
        profileId={profile.id}
        profileName={profile.name}
      />
    </div>
  )
}
