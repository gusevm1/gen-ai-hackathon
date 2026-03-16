'use server'

import { revalidatePath } from 'next/cache'
import { generateText, Output } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createClient } from '@/lib/supabase/server'
import { preferencesSchema, type Preferences } from '@/lib/schemas/preferences'
import { extractionResultSchema } from '@/lib/chat/extraction-schema'

export async function createProfile(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const trimmedName = name.trim()
  if (trimmedName.length < 1 || trimmedName.length > 100) {
    throw new Error('Profile name must be between 1 and 100 characters')
  }

  // Check how many profiles the user already has
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const isFirst = (count ?? 0) === 0
  const defaults = preferencesSchema.parse({})

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: user.id,
      name: trimmedName,
      preferences: defaults,
      is_default: isFirst,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/profiles')
  revalidatePath('/', 'layout')

  return data.id as string
}

export async function renameProfile(profileId: string, newName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const trimmedName = newName.trim()
  if (trimmedName.length < 1 || trimmedName.length > 100) {
    throw new Error('Profile name must be between 1 and 100 characters')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ name: trimmedName })
    .eq('id', profileId)

  if (error) throw new Error(error.message)

  revalidatePath('/profiles')
}

export async function deleteProfile(profileId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Count the user's profiles
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count ?? 0) <= 1) {
    throw new Error('Cannot delete your last profile')
  }

  // Check if the profile being deleted is active
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_default')
    .eq('id', profileId)
    .single()

  const wasActive = profile?.is_default === true

  // Delete the profile
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', profileId)

  if (error) throw new Error(error.message)

  // If the deleted profile was active, auto-activate the oldest remaining
  if (wasActive) {
    const { data: oldest } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (oldest) {
      await supabase.rpc('set_active_profile', { target_profile_id: oldest.id })
    }
  }

  revalidatePath('/profiles')
  revalidatePath('/', 'layout')
}

export async function duplicateProfile(sourceProfileId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Read source profile
  const { data: source, error: readError } = await supabase
    .from('profiles')
    .select('name, preferences')
    .eq('id', sourceProfileId)
    .single()

  if (readError || !source) throw new Error('Source profile not found')

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: user.id,
      name: `${source.name} (Copy)`,
      preferences: source.preferences,
      is_default: false,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/profiles')

  return data.id as string
}

export async function setActiveProfile(profileId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.rpc('set_active_profile', {
    target_profile_id: profileId,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/profiles')
  revalidatePath('/', 'layout')
}

export async function saveProfilePreferences(profileId: string, data: Preferences) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const validated = preferencesSchema.parse(data)

  const { error } = await supabase
    .from('profiles')
    .update({ preferences: validated })
    .eq('id', profileId)

  if (error) throw new Error(error.message)

  revalidatePath('/profiles')
  revalidatePath('/', 'layout')
}

export async function extractPreferencesFromChat(conversationText: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { output } = await generateText({
    model: anthropic('claude-haiku-4-5-20251001'),
    output: Output.object({ schema: extractionResultSchema }),
    prompt: `Extract all property preference criteria from this conversation between a user and a property search assistant.

For each preference mentioned by the user:
- name: a short descriptive label
- value: specific details or requirements (empty string if not specified)
- importance: infer from the user's language. Words like "must", "absolutely", "deal-breaker" \u2192 critical. "Really want", "important" \u2192 high. General mentions \u2192 medium. "Would be nice", "bonus" \u2192 low.

Only include preferences the USER expressed (not suggestions the assistant made that the user didn't confirm).

Conversation:
${conversationText}`,
  })

  return output?.fields ?? []
}
