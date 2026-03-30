/**
 * Supabase Edge Function: score-proxy
 *
 * Validates JWT auth via supabase.auth.getUser(), resolves the user's active
 * profile (is_default=true) via RLS-enforced query, and proxies POST requests
 * to the EC2 backend POST /score endpoint with profile context.
 *
 * Flow: Extension -> Edge Function (auth + profile resolution + proxy) -> EC2 Backend -> Claude -> Response
 *
 * Environment variables:
 * - SUPABASE_URL: Supabase project URL (auto-set by Supabase)
 * - SUPABASE_ANON_KEY: Supabase anon key for auth verification (auto-set)
 * - BACKEND_URL: EC2 backend base URL (set via `supabase secrets set`)
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Extract Authorization header
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing authorization header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Create client with user's auth context for RLS-enforced queries
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  // Verify JWT
  const token = authHeader.replace("Bearer ", "");
  const { data: authData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authData?.user) {
    return new Response(
      JSON.stringify({ error: "Invalid or expired token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Resolve active profile server-side (RLS enforced -- user can only see own profiles)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, preferences")
    .eq("is_default", true)
    .single();

  if (profileError || !profile) {
    return new Response(
      JSON.stringify({ error: "No active profile found. Please set up your preferences." }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Read request body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Cache check: return cached non-stale result if available (CACHE-01)
  const forceRescore = body.force_rescore === true;
  let prefStale = false;

  if (!forceRescore) {
    const { data: cached } = await supabase
      .from("analyses")
      .select("score, breakdown, summary, stale")
      .eq("user_id", authData.user.id)
      .eq("listing_id", String(body.listing_id))
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (cached && !cached.stale) {
      // DB-02: Reject stale v1 cache entries -- require schema_version >= 2
      const schemaVersion = cached.breakdown?.schema_version ?? 0;
      if (schemaVersion >= 2) {
        return new Response(
          JSON.stringify(cached.breakdown),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json", "X-HomeMatch-Cache": "hit" },
          },
        );
      }
      // v1 entry found but schema too old -- fall through to backend for re-scoring
    }

    // Track if the miss was caused by a stale row (vs no row at all)
    prefStale = cached?.stale === true;
  }

  // Forward to backend with profile context
  const backendUrl = Deno.env.get("BACKEND_URL");
  if (!backendUrl) {
    return new Response(
      JSON.stringify({ error: "Backend not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const backendResponse = await fetch(`${backendUrl}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        user_id: authData.user.id,
        profile_id: profile.id,
        preferences: profile.preferences,
      }),
    });

    const responseBody = await backendResponse.text();
    const missHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": "application/json",
      "X-HomeMatch-Cache": "miss",
    };
    if (prefStale) {
      missHeaders["X-HomeMatch-Pref-Stale"] = "true";
    }
    return new Response(responseBody, {
      status: backendResponse.status,
      headers: missHeaders,
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Backend unreachable" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
