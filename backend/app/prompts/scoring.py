"""System and user prompt templates for property scoring.

Covers: EVAL-04 (explicit "Not specified" for missing data),
        EVAL-05 (response in user's preferred language),
        PREF-14 (importance levels, dealbreaker semantics),
        SS-01 (subjective per-criterion fulfillment evaluation),
        SS-03 (OpenRouter JSON schema instructions).
"""

from app.models.listing import FlatfoxListing
from app.models.preferences import ImportanceLevel, UserPreferences

LANGUAGE_MAP = {
    "de": "German (Deutsch)",
    "fr": "French (Francais)",
    "it": "Italian (Italiano)",
    "en": "English",
}


def build_system_prompt(language: str = "de") -> str:
    """Build the system prompt for subjective per-criterion evaluation.

    The prompt instructs the LLM to evaluate specific subjective criteria
    and return per-criterion fulfillment values (0.0-1.0) with reasoning,
    plus 3-5 summary bullets. Includes explicit JSON output schema since
    OpenRouter does not auto-inject Pydantic schemas.

    Args:
        language: ISO language code (de, fr, it, en). Defaults to "de".

    Returns:
        System prompt for subjective scoring via OpenRouter.
    """
    lang_name = LANGUAGE_MAP.get(language, "German (Deutsch)")
    return f"""You are a Swiss real estate evaluation assistant. Your job is to evaluate \
specific subjective criteria for a property listing against a user's preferences, providing \
honest and transparent analysis.

You must NOT produce any combined total, match tier, or per-category aggregation. You evaluate \
only the specific subjective criteria listed in the user prompt, returning a fulfillment value \
and reasoning for each one.

LANGUAGE RULES (MANDATORY — HIGHEST PRIORITY):
- You MUST respond ENTIRELY and EXCLUSIVELY in {lang_name}. This rule overrides everything else.
- Property descriptions, titles, and attributes from Flatfox may be in German or another language — IGNORE the input language completely.
- Treat all Flatfox listing data as raw data only. NEVER mirror or reflect the language of that input.
- Internally reinterpret or translate any German/foreign input as needed to produce output fully in {lang_name}.
- ALL output MUST be in {lang_name}: all reasoning text, summary bullets — EVERYTHING without exception.
- Mixed-language output is strictly forbidden. Before finalizing your response, verify every sentence is in {lang_name}.

EVALUATION RULES:
- For each subjective criterion provided, assign a fulfillment value between 0.0 and 1.0 (in 0.1 increments).
  - 1.0 = criterion fully met
  - 0.7-0.9 = mostly met with minor gaps
  - 0.4-0.6 = partially met, notable compromises
  - 0.1-0.3 = barely met, significant shortcomings
  - 0.0 = not met at all
- Provide concise reasoning for each fulfillment value, citing specific data from the listing.
- If information needed to evaluate a criterion is not available in the listing, state this explicitly and set fulfillment to null.
- If no subjective criteria are listed, still generate summary_bullets based on the listing data and preferences.

IMAGE ANALYSIS:
- When listing photos are provided, evaluate: interior condition and finish quality, natural light \
and window views, kitchen and bathroom condition, general maintenance and upkeep.
- Use observations from photos to inform your criterion evaluations where relevant.
- If no photos are provided, evaluate based on text data only and note that visual assessment \
was not possible.

PRICE EVALUATION RULES:
- The listing's **Type** field shows the offer_type (RENT or SALE). Always use this to interpret the price.
- If offer_type is SALE: the price is the TOTAL PURCHASE PRICE (one-time). NEVER interpret it as monthly rent. A price of CHF 1,500,000 for a SALE listing is a purchase price, not rent.
- If offer_type is RENT: the price is MONTHLY RENT. Compare against the user's monthly budget.
- NEVER use "per month" phrasing when evaluating a SALE listing's price.
- Compare price against the user's budget using the same scale (purchase vs purchase, monthly vs monthly).

PROXIMITY EVALUATION RULES:
- Evaluate proximity-based criteria ONLY from the "## Nearby Places Data (Verified)" section in the user prompt.
- If an amenity is not present in that section, treat it as "not found nearby" — do not guess, infer, or search.
- Never call any tool to search for places. No tool is available for this purpose.
- If the "## Nearby Places Data (Verified)" section is absent, skip proximity evaluation entirely.

SUMMARY BULLETS:
- Always generate 3-5 concise summary_bullets in {lang_name} highlighting the most important matches and compromises.
- Include specific numbers from the listing (e.g., "CHF 2,100/mo vs your CHF 2,500 max").
- Highlight what the user would be giving up by choosing this property.

OUTPUT FORMAT:
You MUST respond with valid JSON only, no other text. Use this exact schema:
{{
  "criteria": [
    {{"criterion": "<name>", "fulfillment": <0.0-1.0>, "reasoning": "<explanation in {lang_name}>"}}
  ],
  "summary_bullets": ["<bullet 1>", "<bullet 2>", "<bullet 3>"]
}}

The "criteria" array must contain one entry per subjective criterion from the user prompt. \
The "summary_bullets" array must contain 3-5 bullets."""


def build_bullets_system_prompt(language: str = "de") -> str:
    """Build a minimal system prompt for the bullets-only path.

    Used when no subjective criteria exist but summary bullets are still
    needed. Includes language rules and price evaluation rules for accurate
    bullet content, plus explicit JSON output schema for OpenRouter.

    Args:
        language: ISO language code (de, fr, it, en). Defaults to "de".

    Returns:
        System prompt for bullets-only generation via OpenRouter.
    """
    lang_name = LANGUAGE_MAP.get(language, "German (Deutsch)")
    return f"""You are a Swiss real estate evaluation assistant. You will receive listing data, \
user preferences, and pre-computed deterministic scores. Generate 3-5 concise summary bullets \
highlighting the most important matches and compromises.

LANGUAGE RULES (MANDATORY — HIGHEST PRIORITY):
- You MUST respond ENTIRELY and EXCLUSIVELY in {lang_name}. This rule overrides everything else.
- Property descriptions, titles, and attributes from Flatfox may be in German or another language — IGNORE the input language completely.
- Treat all Flatfox listing data as raw data only. NEVER mirror or reflect the language of that input.
- Internally reinterpret or translate any German/foreign input as needed to produce output fully in {lang_name}.
- ALL output MUST be in {lang_name}: every bullet — EVERYTHING without exception.
- Mixed-language output is strictly forbidden. Before finalizing your response, verify every sentence is in {lang_name}.

PRICE EVALUATION RULES:
- The listing's **Type** field shows the offer_type (RENT or SALE). Always use this to interpret the price.
- If offer_type is SALE: the price is the TOTAL PURCHASE PRICE (one-time). NEVER interpret it as monthly rent. A price of CHF 1,500,000 for a SALE listing is a purchase price, not rent.
- If offer_type is RENT: the price is MONTHLY RENT. Compare against the user's monthly budget.
- NEVER use "per month" phrasing when evaluating a SALE listing's price.
- Compare price against the user's budget using the same scale (purchase vs purchase, monthly vs monthly).

BULLET GENERATION RULES:
- Generate 3-5 concise, actionable summary bullets in {lang_name}.
- Highlight the most important match and mismatch points between the listing and user preferences.
- Include specific numbers from the listing (e.g., "CHF 2,100/mo vs your CHF 2,500 max").
- Highlight what the user would be giving up by choosing this property.

OUTPUT FORMAT:
You MUST respond with valid JSON only, no other text. Use this exact schema:
{{"summary_bullets": ["<bullet 1>", "<bullet 2>", "<bullet 3>"]}}

The "summary_bullets" array must contain 3-5 bullets."""


def _fmt_range(min_val, max_val, prefix="", suffix="") -> str:
    """Format a numeric range, handling None values.

    Args:
        min_val: Minimum value (or None).
        max_val: Maximum value (or None).
        prefix: Prefix before each number (e.g. "CHF ").
        suffix: Suffix after each number (e.g. " sqm").

    Returns:
        Formatted range string like "CHF 1,500 - CHF 2,500".
    """
    min_str = f"{prefix}{min_val:,}{suffix}" if min_val is not None else "No min"
    max_str = f"{prefix}{max_val:,}{suffix}" if max_val is not None else "No max"
    return f"{min_str} - {max_str}"


def _format_importance_section(prefs: UserPreferences) -> str:
    """Format the category importance section for the user prompt.

    Emits human-readable importance levels (CRITICAL/HIGH/MEDIUM/LOW)
    instead of numeric weights.

    Args:
        prefs: User preferences with importance levels.

    Returns:
        Formatted importance section string.
    """
    imp = prefs.importance
    return f"""**Category Importance:**
- Location: {imp.location.value.upper()}
- Price: {imp.price.value.upper()}
- Size: {imp.size.value.upper()}
- Features: {imp.features.value.upper()}
- Condition: {imp.condition.value.upper()}"""


def _format_dealbreakers_section(prefs: UserPreferences) -> str:
    """Format the dealbreakers section for the user prompt.

    Only includes dealbreaker lines where: (a) the toggle is True, and
    (b) the corresponding threshold value exists.

    Args:
        prefs: User preferences with dealbreaker toggles.

    Returns:
        Formatted dealbreakers section, or empty string if none active.
    """
    lines = []

    if prefs.budget_dealbreaker and prefs.budget_max is not None:
        lines.append(f"- Budget max: CHF {prefs.budget_max:,} (HARD LIMIT)")

    if prefs.rooms_dealbreaker and prefs.rooms_min is not None:
        lines.append(f"- Rooms min: {prefs.rooms_min} (HARD LIMIT)")

    if prefs.living_space_dealbreaker and prefs.living_space_min is not None:
        lines.append(f"- Living space min: {prefs.living_space_min} sqm (HARD LIMIT)")

    if not lines:
        return ""

    return "\n\n**Dealbreakers (score 0 if violated):**\n" + "\n".join(lines)


IMPORTANCE_LABELS: dict[ImportanceLevel, str] = {
    ImportanceLevel.CRITICAL: "CRITICAL (must have)",
    ImportanceLevel.HIGH: "HIGH (strongly preferred)",
    ImportanceLevel.MEDIUM: "MEDIUM (nice to have)",
    ImportanceLevel.LOW: "LOW (minor preference)",
}


def _format_dynamic_fields_section(prefs: UserPreferences) -> str:
    """Format dynamic fields grouped by importance level.

    Returns an empty string if dynamic_fields is empty. Otherwise, groups
    fields by importance and renders each group with a header label.

    Args:
        prefs: User preferences with dynamic_fields list.

    Returns:
        Formatted custom criteria section, or empty string if none.
    """
    if not prefs.dynamic_fields:
        return ""

    # Group fields by importance level
    groups: dict[ImportanceLevel, list[str]] = {}
    for field in prefs.dynamic_fields:
        label = f"{field.name}: {field.value}" if field.value else field.name
        groups.setdefault(field.importance, []).append(label)

    # Render in priority order
    lines = ["**Custom Criteria (by importance):**"]
    for level in [
        ImportanceLevel.CRITICAL,
        ImportanceLevel.HIGH,
        ImportanceLevel.MEDIUM,
        ImportanceLevel.LOW,
    ]:
        if level in groups:
            lines.append(f"  {IMPORTANCE_LABELS[level]}:")
            for item in groups[level]:
                lines.append(f"  - {item}")

    return "\n".join(lines)


def build_user_prompt(
    listing: FlatfoxListing,
    prefs: UserPreferences,
    nearby_places: dict[str, list[dict]] | None = None,
    listing_profile_context: dict | None = None,
) -> str:
    """Build the user prompt with listing data and preferences.

    Formats listing and preferences into structured readable text.
    Truncates description to 2000 chars. Handles None fields with "Not specified".

    Args:
        listing: The Flatfox listing to evaluate.
        prefs: The user's search preferences.
        nearby_places: Optional dict mapping amenity query string to list of place
            result dicts. When provided, appended as a verified data section before
            the closing evaluation instruction.

    Returns:
        Formatted user prompt with listing data and preferences.
    """
    # Format listing attributes
    attrs = (
        ", ".join(a.name for a in listing.attributes)
        if listing.attributes
        else "None listed"
    )

    # Truncate long descriptions
    desc_truncated = (listing.description or "No description")[:2000]

    # Format price display — use offer_type to avoid misclassifying sale prices as monthly rent
    is_sale = listing.offer_type.upper() == "SALE"
    if is_sale:
        # Sale listing: price_display is the total purchase price, never monthly
        if listing.price_display:
            price_str = f"CHF {listing.price_display:,} (total purchase price)"
        else:
            price_str = "Not specified"
    else:
        # Rental listing: show monthly rent with breakdown
        if listing.rent_gross:
            breakdown_parts = []
            if listing.rent_net is not None:
                breakdown_parts.append(f"net: CHF {listing.rent_net:,}")
            if listing.rent_charges is not None:
                breakdown_parts.append(f"charges: CHF {listing.rent_charges:,}")
            breakdown = f" ({', '.join(breakdown_parts)})" if breakdown_parts else ""
            price_str = f"CHF {listing.rent_gross:,}/month{breakdown}"
        elif listing.price_display:
            price_str = f"CHF {listing.price_display:,}/month"
        else:
            price_str = "Not specified"

    # Format address
    if listing.public_address:
        address_str = listing.public_address
    elif listing.street and listing.zipcode and listing.city:
        address_str = f"{listing.street}, {listing.zipcode} {listing.city}"
    else:
        address_str = "Not specified"

    # Format title
    title_str = (
        listing.description_title
        or listing.public_title
        or "Untitled"
    )

    # Format budget with inline dealbreaker label
    budget_str = _fmt_range(prefs.budget_min, prefs.budget_max, prefix="CHF ")
    if prefs.budget_dealbreaker:
        budget_str += " (DEALBREAKER)"

    # Format rooms with inline dealbreaker label
    rooms_str = _fmt_range(prefs.rooms_min, prefs.rooms_max)
    if prefs.rooms_dealbreaker:
        rooms_str += " (DEALBREAKER)"

    # Format living space with inline dealbreaker label
    ls_str = _fmt_range(prefs.living_space_min, prefs.living_space_max, suffix=" sqm")
    if prefs.living_space_dealbreaker:
        ls_str += " (DEALBREAKER)"

    # Build importance, dealbreakers, and dynamic fields sections
    importance_section = _format_importance_section(prefs)
    dealbreakers_section = _format_dealbreakers_section(prefs)
    dynamic_fields_section = _format_dynamic_fields_section(prefs)

    # Use dynamic fields when present; fall back to soft criteria for backward compat
    if dynamic_fields_section:
        criteria_line = ""
        criteria_block = f"\n{dynamic_fields_section}"
    else:
        criteria_line = f'\n**Soft criteria:** {", ".join(prefs.soft_criteria) if prefs.soft_criteria else "None"}'
        criteria_block = ""

    # Format coordinates
    if listing.latitude is not None and listing.longitude is not None:
        coords_str = f"{listing.latitude}, {listing.longitude}"
    else:
        coords_str = "Not available"

    # Build the base prompt (preferences + listing data + closing instruction)
    base = f"""## User Preferences

**Location:** {prefs.location or "No preference"}
**Type:** {prefs.offer_type.value} | {prefs.object_category.value}
**Budget:** {budget_str}
**Rooms:** {rooms_str}
**Living space:** {ls_str}
**Floor preference:** {prefs.floor_preference}
**Availability:** {prefs.availability}
**Desired features:** {", ".join(prefs.features) if prefs.features else "None"}{criteria_line}

{importance_section}{dealbreakers_section}{criteria_block}

---

## Listing Data

**Title:** {title_str}
**Address:** {address_str}
**Coordinates:** {coords_str}
**Canton:** {listing.state or "Not specified"}
**Type:** {listing.offer_type} | {listing.object_category} ({listing.object_type})
**Price:** {price_str}
**Rooms:** {listing.number_of_rooms or "Not specified"}
**Living space:** {f"{listing.surface_living} sqm" if listing.surface_living else "Not specified"}
**Floor:** {listing.floor if listing.floor is not None else "Not specified"}
**Year built:** {listing.year_built or "Not specified"}
**Year renovated:** {listing.year_renovated or "Not specified"}
**Available:** {listing.moving_date or listing.moving_date_type or "Not specified"}
**Features/Attributes:** {attrs}
**Furnished:** {"Yes" if listing.is_furnished else "No"}
**Temporary:** {"Yes" if listing.is_temporary else "No"}

**Description:**
{desc_truncated}

---

Evaluate this listing against the user's preferences based on the subjective criteria provided. \
Return a fulfillment score (0.0-1.0) with reasoning for each criterion, and 3-5 summary bullets \
highlighting key matches and compromises."""

    # Append pre-analyzed property data from ListingProfile when available (Problem 6)
    if listing_profile_context:
        ctx = listing_profile_context
        lines = ["\n\n---\n\n## Pre-Analyzed Property Data (AI-assessed)\n"]
        lines.append(
            "The following data was assessed before this evaluation. "
            "Use it when generating criterion evaluations and summary bullets.\n"
        )
        if ctx.get("condition_score") is not None:
            note = f" ({ctx['condition_note']})" if ctx.get("condition_note") else ""
            lines.append(f"- Condition score: {ctx['condition_score']}/100{note}")
        if ctx.get("natural_light_score") is not None:
            lines.append(f"- Natural light: {ctx['natural_light_score']}/100")
        if ctx.get("kitchen_quality_score") is not None:
            note = f" ({ctx['kitchen_note']})" if ctx.get("kitchen_note") else ""
            lines.append(f"- Kitchen quality: {ctx['kitchen_quality_score']}/100{note}")
        if ctx.get("bathroom_quality_score") is not None:
            note = f" ({ctx['bathroom_note']})" if ctx.get("bathroom_note") else ""
            lines.append(f"- Bathroom quality: {ctx['bathroom_quality_score']}/100{note}")
        if ctx.get("interior_style"):
            lines.append(f"- Interior style: {ctx['interior_style']}")
        if ctx.get("neighborhood_character"):
            lines.append(f"- Neighborhood character: {ctx['neighborhood_character']}")
        if ctx.get("noise_level_estimate") is not None:
            lines.append(f"- Noise level estimate: {ctx['noise_level_estimate']}/100 (100=very noisy)")
        if ctx.get("image_highlights"):
            lines.append(f"- Image highlights: {', '.join(ctx['image_highlights'])}")
        if ctx.get("image_concerns"):
            lines.append(f"- Image concerns: {', '.join(ctx['image_concerns'])}")
        if ctx.get("description_summary"):
            lines.append(f"- Description summary: {ctx['description_summary']}")
        base += "\n".join(lines)

    # Append verified nearby places section when pre-fetched data is available (PROMPT-01, PROMPT-02)
    if nearby_places:
        lines = ["\n\n---\n\n## Nearby Places Data (Verified)\n"]
        lines.append(
            "The following results were fetched from Google Places before this evaluation.\n"
            "Evaluate all proximity-based criteria EXCLUSIVELY from this data.\n"
        )
        for query, places in nearby_places.items():
            lines.append(f"\n### {query}")
            if places:
                for i, place in enumerate(places, start=1):
                    name = place.get("name", "Unknown")
                    dist = place.get("distance_km")
                    rating = place.get("rating")
                    review_count = place.get("review_count")
                    address = place.get("address", "")
                    dist_str = f"{dist:.2f} km" if dist is not None else "distance unknown"
                    # Annotate fallback results for the LLM scorer
                    is_fallback = place.get("is_fallback", False)
                    fallback_str = " [FALLBACK — outside requested radius]" if is_fallback else ""
                    rating_str = (
                        f" | Rating: {rating} ({review_count} reviews)"
                        if rating is not None
                        else ""
                    )
                    lines.append(f"{i}. {name} — {dist_str}{fallback_str}{rating_str}")
                    if address:
                        lines.append(f"   {address}")
            else:
                lines.append("No results found.")
        lines.append(
            "\n\nIf an amenity is NOT listed above, treat it as \"not found nearby\" "
            "— do not guess or infer from listing description."
        )
        return base + "\n".join(lines)

    return base


def build_image_content_blocks(image_urls: list[str]) -> list[dict]:
    """Build Claude Vision API image content blocks from a list of URLs.

    Creates URL-based image content blocks for the Claude messages API.
    Returns an empty list if no URLs are provided (backward compatible).

    Args:
        image_urls: List of image URLs to include in the prompt.

    Returns:
        List of image content block dicts for Claude messages API.
    """
    return [
        {"type": "image", "source": {"type": "url", "url": url}}
        for url in image_urls
    ]
