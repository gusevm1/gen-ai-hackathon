import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PreferencesForm } from '@/components/preferences/preferences-form'
import { loadPreferences, savePreferences } from './actions'
import { preferencesSchema } from '@/lib/schemas/preferences'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const saved = await loadPreferences()
  const defaults = preferencesSchema.parse(saved ?? {})

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-2">Your Preferences</h1>
      <p className="text-muted-foreground mb-8">
        Tell HomeMatch what you are looking for. These preferences will be used to score listings on Flatfox.
      </p>
      <PreferencesForm defaultValues={defaults} onSave={savePreferences} />
    </div>
  )
}
