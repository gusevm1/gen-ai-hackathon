'use server'

import { createClient } from '@/lib/supabase/server'
import { preferencesSchema, type Preferences } from '@/lib/schemas/preferences'

export async function savePreferences(data: Preferences) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Validate with Zod before saving
  const validated = preferencesSchema.parse(data)

  // Find the user's default profile, or create one
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_default', true)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('profiles')
      .update({ preferences: validated })
      .eq('id', existing.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        name: 'Meine Suche',
        preferences: validated,
        is_default: true,
      })
    if (error) throw new Error(error.message)
  }
}

export async function loadPreferences(): Promise<Preferences | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('is_default', true)
    .single()

  if (error || !data) return null
  return preferencesSchema.parse(data.preferences)
}
