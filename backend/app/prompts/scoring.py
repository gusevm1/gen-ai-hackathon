"""System and user prompt templates for Claude property scoring.

Covers: EVAL-04 (explicit "Not specified" for missing data),
        EVAL-05 (response in user's preferred language).
"""

from app.models.listing import FlatfoxListing
from app.models.preferences import UserPreferences

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
considering category weights.
- Evaluate all 5 categories: location, price, size, features, condition.
- For the checklist, evaluate each soft criterion and desired feature individually.
- Assign a match_tier based on the overall score: excellent (80+), good (60-79), fair (40-59), poor (<40).

IMAGE ANALYSIS:
- When listing photos are provided, evaluate: interior condition and finish quality, natural light \
and window views, kitchen and bathroom condition, general maintenance and upkeep.
- Use observations from photos to enhance your condition and features category scores.
- If no photos are provided, evaluate based on text data only and note that visual assessment \
was not possible."""


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

    # Format price display
    if listing.rent_gross:
        price_str = (
            f"CHF {listing.rent_gross:,}/month "
            f"(net: {listing.rent_net}, charges: {listing.rent_charges})"
        )
    elif listing.price_display:
        price_str = f"CHF {listing.price_display:,}"
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

    return f"""## User Preferences

**Location:** {prefs.location or "No preference"}
**Type:** {prefs.offer_type.value} | {prefs.object_category.value}
**Budget:** {f"CHF {prefs.budget_min:,}" if prefs.budget_min else "No min"} - \
{f"CHF {prefs.budget_max:,}" if prefs.budget_max else "No max"}
**Rooms:** {prefs.rooms_min or "No min"} - {prefs.rooms_max or "No max"}
**Living space:** {f"{prefs.living_space_min} sqm" if prefs.living_space_min else "No min"} - \
{f"{prefs.living_space_max} sqm" if prefs.living_space_max else "No max"}
**Soft criteria:** {", ".join(prefs.soft_criteria) if prefs.soft_criteria else "None"}
**Desired features:** {", ".join(prefs.selected_features) if prefs.selected_features else "None"}

**Category weights (0-100 importance):**
- Location: {prefs.weights.location}
- Price: {prefs.weights.price}
- Size: {prefs.weights.size}
- Features: {prefs.weights.features}
- Condition: {prefs.weights.condition}

---

## Listing Data

**Title:** {title_str}
**Address:** {address_str}
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
(location, price, size, features, condition), evaluate the soft criteria and desired features \
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
