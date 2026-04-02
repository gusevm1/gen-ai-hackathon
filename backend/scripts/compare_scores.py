"""Compare deterministic-only vs hybrid (LLM-enriched) scores for top matches."""
from app.services.listing_profile_db import get_listing_profile
from app.services.supabase import supabase_service
from app.models.preferences import UserPreferences
from app.routers.scoring import _score_deterministic_only

client = supabase_service.get_client()

# Load cached top matches
cache = client.table("top_matches_cache").select("matches").limit(1).execute()
matches = cache.data[0]["matches"]

# Load preferences
prefs_row = (
    client.table("profiles")
    .select("preferences")
    .eq("id", "f5a75e23-d72c-4839-873c-3daab4e9a9d9")
    .single()
    .execute()
)
preferences = UserPreferences.model_validate(prefs_row.data["preferences"])

print("=" * 80)
print(f"{'DETERMINISTIC vs HYBRID SCORE COMPARISON':^80}")
print("=" * 80)
print(f"{'Listing':<50} {'Det':>5} {'Hyb':>5} {'Delta':>6}")
print("-" * 80)

total_delta = 0

for m in matches:
    listing_id = m["listing_id"]
    hybrid_score = m["score_response"]["overall_score"]
    hybrid_tier = m["score_response"]["match_tier"]

    profile = get_listing_profile(listing_id)
    if not profile:
        print(f"  [Profile not found for listing {listing_id}]")
        continue

    det_score, det_tier, det_results = _score_deterministic_only(profile, preferences)
    delta = hybrid_score - det_score
    total_delta += abs(delta)

    title = (m.get("title") or "?")[:48]
    print(f"{title:<50} {det_score:>4}  {hybrid_score:>4}  {delta:>+5}")

    # Build hybrid criteria lookup (camelCase keys from JSON)
    hybrid_criteria = {}
    for cr in m["score_response"].get("criteria_results", []):
        name = cr.get("criterionName") or cr.get("criterion_name", "")
        hybrid_criteria[name] = cr

    # Per-criterion comparison
    for dr in det_results:
        hc = hybrid_criteria.get(dr.criterion_name, {})
        d_pct = f"{dr.fulfillment*100:.0f}%" if dr.fulfillment is not None else "N/A"
        h_ful = hc.get("fulfillment")
        h_pct = f"{h_ful*100:.0f}%" if h_ful is not None else "N/A"
        has_reasoning = bool(hc.get("reasoning"))

        marker = ""
        if dr.fulfillment is not None and h_ful is not None:
            diff = abs(dr.fulfillment - h_ful) * 100
            if diff > 10:
                marker = f" ** DIFF {diff:.0f}pp"

        print(f"    {dr.criterion_name:<32} det={d_pct:<6} hyb={h_pct:<6} reasoning={'Y' if has_reasoning else 'N'}{marker}")

    # Show subjective criteria (LLM-only, not in deterministic)
    det_names = {dr.criterion_name for dr in det_results}
    for cname, hc in hybrid_criteria.items():
        if cname not in det_names:
            h_ful = hc.get("fulfillment")
            h_pct = f"{h_ful*100:.0f}%" if h_ful is not None else "N/A"
            print(f"    {cname:<32} det=---    hyb={h_pct:<6} [subjective]")

    print()

avg_delta = total_delta / len(matches) if matches else 0
print("-" * 80)
print(f"Average absolute deviation: {avg_delta:.1f} points")
print(f"Total listings compared: {len(matches)}")
