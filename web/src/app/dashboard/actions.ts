'use server'

import { createClient } from '@/lib/supabase/server'
import { preferencesSchema, type Preferences } from '@/lib/schemas/preferences'

export async function savePreferences(data: Preferences) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Validate with Zod before saving
  const validated = preferencesSchema.parse(data)

  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: user.id,
        preferences: validated,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) throw new Error(error.message)
}

export async function loadPreferences(): Promise<Preferences | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('user_preferences')
    .select('preferences')
    .eq('user_id', user.id)
    .single()

  if (error || !data) return null
  return preferencesSchema.parse(data.preferences)
}
