"""System and user prompt templates for Claude property scoring.

Covers: EVAL-04 (explicit "Not specified" for missing data),
        EVAL-05 (response in user's preferred language),
        PREF-14 (importance levels, dealbreaker semantics).
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
    """Build the system prompt for Claude property evaluation.

    Args:
        language: ISO language code (de, fr, it, en). Defaults to "de".

    Returns:
        System prompt instructing Claude to act as a Swiss real estate evaluator.
    """
    lang_name = LANGUAGE_MAP.get(language, "German (Deutsch)")
    return f"""You are a Swiss real estate evaluation assistant. Your job is to score \
a property listing against a user's preferences, providing honest and transparent analysis.

LANGUAGE RULES (MANDATORY — HIGHEST PRIORITY):
- You MUST respond ENTIRELY and EXCLUSIVELY in {lang_name}. This rule overrides everything else.
- Property descriptions, titles, and attributes from Flatfox may be in German or another language — IGNORE the input language completely.
- Treat all Flatfox listing data as raw data only. NEVER mirror or reflect the language of that input.
- Internally reinterpret or translate any German/foreign input as needed to produce output fully in {lang_name}.
- ALL output MUST be in {lang_name}: section titles, content, bullet points, summaries, category labels — EVERYTHING without exception.
- Mixed-language output is strictly forbidden. Before finalizing your response, verify every sentence is in {lang_name}.

RULES:
- Respond entirely in {lang_name}.
- For each category, provide a 0-100 score based on how well the listing matches the user's preferences.
- If a data point is NOT available in the listing, explicitly state this. Use phrases like \
"Not specified in listing" or "Information not available". Never guess or assume.
- Highlight compromises clearly -- what the user would be giving up by choosing this property.
- Include specific numbers from the listing alongside qualitative assessments \
(e.g., "CHF 2,100/mo vs your CHF 2,500 max -- within budget").
- Summary bullets should be concise, actionable, and highlight the most important match/mismatch points.
- The overall score should reflect how well this property matches the user's complete profile, \
considering category importance levels.
- Evaluate all 5 categories: location, price, size, features, condition.
- For the checklist, evaluate each custom criterion and desired feature individually.
- Assign a match_tier based on the overall score: excellent (80+), good (60-79), fair (40-59), poor (<40).

IMAGE ANALYSIS:
- When listing photos are provided, evaluate: interior condition and finish quality, natural light \
and window views, kitchen and bathroom condition, general maintenance and upkeep.
- Use observations from photos to enhance your condition and features category scores.
- If no photos are provided, evaluate based on text data only and note that visual assessment \
was not possible.

PRICE EVALUATION RULES:
- The listing's **Type** field shows the offer_type (RENT or SALE). Always use this to interpret the price.
- If offer_type is SALE: the price is the TOTAL PURCHASE PRICE (one-time). NEVER interpret it as monthly rent. A price of CHF 1,500,000 for a SALE listing is a purchase price, not rent.
- If offer_type is RENT: the price is MONTHLY RENT. Compare against the user's monthly budget.
- NEVER use "per month" phrasing when evaluating a SALE listing's price.
- Compare price against the user's budget using the same scale (purchase vs purchase, monthly vs monthly).

DEALBREAKER RULES:
- When the user marks a constraint as a DEALBREAKER (HARD LIMIT), and the listing violates that constraint, you MUST:
  1. Score that category at 0.
  2. Set the overall match_tier to "poor" regardless of other category scores.
  3. Explicitly state the dealbreaker violation in summary_bullets.
- A budget dealbreaker means the listing price EXCEEDS the user's maximum -- score price at 0.
- A rooms dealbreaker means the listing has FEWER rooms than the user's minimum -- score size at 0.
- A living space dealbreaker means the listing has LESS space than the user's minimum -- score size at 0.

SCORE DISTRIBUTION:
- Use the FULL 0–100 range. Avoid clustering around specific numbers. Scores must reflect real differences between listings.
- Score anchors: 90–100 = near perfect match | 70–89 = strong match | 50–69 = moderate match with compromises | 30–49 = weak match | 0–29 = poor match.
- Each category score MUST be justified by concrete data from the listing (e.g., price numbers, room count, location, specific features).
- The overall score must be derived logically from the weighted category scores — do not guess it independently.

IMPORTANCE LEVELS:
- Category importance is expressed as: CRITICAL, HIGH, MEDIUM, LOW.
- Use these to weight your overall score calculation. CRITICAL categories matter most.
- For the weight field in each category response, use: critical=90, high=70, medium=50, low=30.

PROXIMITY EVALUATION RULES:
- Evaluate proximity-based criteria ONLY from the "## Nearby Places Data (Verified)" section in the user prompt.
- If an amenity is not present in that section, score it as "not found nearby" — do not guess, infer, or search.
- Never call any tool to search for places. No tool is available for this purpose.
- If the "## Nearby Places Data (Verified)" section is absent, the user has no proximity requirements — skip proximity evaluation entirely."""


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


def build_user_prompt(listing: FlatfoxListing, prefs: UserPreferences) -> str:
    """Build the user prompt with listing data and preferences.

    Formats listing and preferences into structured readable text.
    Truncates description to 2000 chars. Handles None fields with "Not specified".

    Args:
        listing: The Flatfox listing to evaluate.
        prefs: The user's search preferences.

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

    return f"""## User Preferences

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

Evaluate this listing against the user's preferences. Score each of the 5 categories \
(location, price, size, features, condition), evaluate the custom criteria and desired features \
as a checklist, and provide an overall score with summary bullets highlighting key matches \
and compromises."""


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
