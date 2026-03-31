/**
 * Edge function API client for scoring listings.
 * Calls the Supabase score-proxy edge function with JWT auth.
 */
import type { ScoreResponse } from '@/types/scoring';

const EDGE_FUNCTION_URL =
  'https://mlhtozdtiorkemamzjjc.supabase.co/functions/v1/score-proxy';
const SUPABASE_ANON_KEY = 'sb_publishable_SP7baaxxxHimQk_4ESpB3g_Q8--KBPY';

/**
 * Wraps a ScoreResponse with cache metadata from the edge function.
 */
export interface ScoreResult {
  data: ScoreResponse;
  prefStale: boolean;
}

/**
 * Score a single listing via the edge function.
 *
 * @param listingId - Flatfox listing PK
 * @param jwt - Supabase JWT access token
 * @param forceRescore - Bypass cache and force a fresh score
 * @returns ScoreResult with parsed ScoreResponse and prefStale flag
 * @throws Error on non-200 response
 */
export async function scoreListing(
  listingId: number,
  jwt: string,
  forceRescore: boolean = false,
): Promise<ScoreResult> {
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ listing_id: listingId, force_rescore: forceRescore }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `score-proxy returned ${res.status}: ${body || res.statusText}`,
    );
  }

  const prefStale = res.headers.get('X-HomeMatch-Pref-Stale') === 'true';
  const data = (await res.json()) as ScoreResponse;
  return { data, prefStale };
}

/**
 * Score multiple listings in parallel batches. Calls `onResult` after
 * each individual listing scores for progressive badge rendering.
 *
 * @param listingIds - Array of Flatfox listing PKs
 * @param jwt - Supabase JWT access token
 * @param onResult - Optional callback invoked after each listing is scored
 * @param forceRescore - Bypass cache and force fresh scores
 * @param concurrency - Max parallel requests per batch (default: 20)
 * @returns Map of listingId to ScoreResponse (only successful scores)
 */
export async function scoreListings(
  listingIds: number[],
  jwt: string,
  onResult?: (id: number, result: ScoreResponse, prefStale: boolean) => void,
  forceRescore: boolean = false,
  concurrency: number = 20,
): Promise<Map<number, ScoreResponse>> {
  const results = new Map<number, ScoreResponse>();

  for (let i = 0; i < listingIds.length; i += concurrency) {
    const batch = listingIds.slice(i, i + concurrency);

    const settled = await Promise.allSettled(
      batch.map(async (id) => {
        const { data, prefStale } = await scoreListing(id, jwt, forceRescore);
        results.set(id, data);
        onResult?.(id, data, prefStale);
      }),
    );

    for (const result of settled) {
      if (result.status === 'rejected') {
        console.error('[HomeMatch] Scoring failed for a listing:', result.reason);
      }
    }
  }

  return results;
}
