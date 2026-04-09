import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Upsert — idempotent, returns success even if already exists
  const { error } = await supabase
    .from('alpha_users')
    .upsert({ email: email.toLowerCase().trim(), approved: false }, { onConflict: 'email', ignoreDuplicates: true })

  if (error) {
    console.error('Waitlist insert error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
