import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export async function POST(req: NextRequest) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { detail: "Backend URL not configured" },
      { status: 500 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  // Get active profile
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_default", true)
    .limit(1)

  const profileId = profiles?.[0]?.id
  if (!profileId) {
    return NextResponse.json(
      { detail: "No active profile found" },
      { status: 404 }
    )
  }

  const body = await req.json().catch(() => ({}))

  try {
    const res = await fetch(`${BACKEND_URL}/score/top-matches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        profile_id: profileId,
        force_refresh: body.force_refresh ?? false,
      }),
      signal: AbortSignal.timeout(60000),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backend unreachable"
    return NextResponse.json({ detail: message }, { status: 502 })
  }
}
