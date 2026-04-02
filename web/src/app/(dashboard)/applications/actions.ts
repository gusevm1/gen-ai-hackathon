'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function recordApplication(
  profileId: string,
  listingId: string,
  listingAddress: string,
  listingType: string,
  message: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // upsert: unique constraint on (user_id, profile_id, listing_id) -- silently ignore duplicate
  const { error } = await supabase
    .from('applications')
    .upsert(
      { user_id: user.id, profile_id: profileId, listing_id: listingId, listing_address: listingAddress, listing_type: listingType, message },
      { onConflict: 'user_id,profile_id,listing_id', ignoreDuplicates: true }
    )

  if (error) throw new Error(error.message)

  revalidatePath('/applications')
  revalidatePath('/top-matches')
}
