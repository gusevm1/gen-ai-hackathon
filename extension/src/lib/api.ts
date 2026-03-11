/**
 * Edge function API client for scoring listings.
 * Calls the Supabase score-proxy edge function with JWT auth.
 */
import type { ScoreResponse } from '@/types/scoring';

const EDGE_FUNCTION_URL =
  'https://mlhtozdtiorkemamzjjc.supabase.co/functions/v1/score-proxy';

/**
 * Score a single listing via the edge function.
 *
 * @param listingId - Flatfox listing PK
 * @param jwt - Supabase JWT access token
 * @returns Parsed ScoreResponse
 * @throws Error on non-200 response
 */
export async function scoreListing(
  listingId: number,
  jwt: string,
): Promise<ScoreResponse> {
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ listing_id: listingId }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `score-proxy returned ${res.status}: ${body || res.statusText}`,
    );
  }

  return (await res.json()) as ScoreResponse;
}

/**
 * Score multiple listings sequentially (NOT in parallel to avoid
 * overwhelming the backend). Calls `onResult` after each score
 * arrives for progressive rendering.
 *
 * @param listingIds - Array of Flatfox listing PKs
 * @param jwt - Supabase JWT access token
 * @param onResult - Optional callback invoked after each listing is scored
 * @returns Map of listingId to ScoreResponse
 */
export async function scoreListings(
  listingIds: number[],
  jwt: string,
  onResult?: (id: number, result: ScoreResponse) => void,
): Promise<Map<number, ScoreResponse>> {
  const results = new Map<number, ScoreResponse>();

  for (const id of listingIds) {
    const result = await scoreListing(id, jwt);
    results.set(id, result);
    onResult?.(id, result);
  }

  return results;
}
