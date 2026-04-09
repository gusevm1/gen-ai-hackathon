import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('alpha_users')
    .select('approved')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (!data || !data.approved) {
    return NextResponse.json({ error: 'Not approved' }, { status: 403 })
  }

  return NextResponse.json({ approved: true })
}
