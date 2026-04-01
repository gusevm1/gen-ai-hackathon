"""Adapter: ListingProfile -> FlatfoxListing + amenity proximity data.

Implements INT-03 (Phase 31): bridges the pre-computed ListingProfile
(Layer 1) into the FlatfoxListing format consumed by the deterministic
scorer (Layer 2), so the scorer code stays unchanged.

Also converts ListingProfile.amenities into the proximity_data dict
format expected by score_proximity_quality().

Type coercions:
- attributes: list[str] -> list[FlatfoxAttribute]
- rooms: Optional[float] -> Optional[str]
- sqm -> surface_living
- canton -> state
- price -> price_display + rent_gross (for RENT)
"""

from __future__ import annotations

from app.models.listing import FlatfoxAttribute, FlatfoxListing
from app.models.listing_profile import AmenityCategory, ListingProfile


def adapt_profile_to_listing(profile: ListingProfile) -> FlatfoxListing:
    """Convert a ListingProfile to a FlatfoxListing for the deterministic scorer.

    The deterministic scorer expects a FlatfoxListing. This adapter maps
    ListingProfile fields to their FlatfoxListing equivalents with the
    required type coercions.

    Args:
        profile: Pre-computed listing profile from Layer 1.

    Returns:
        FlatfoxListing populated from the profile data.
    """
    url = f"https://flatfox.ch/en/flat/{profile.slug}/" if profile.slug else ""

    return FlatfoxListing(
        pk=profile.listing_id,
        slug=profile.slug,
        url=url,
        short_url=url,
        status="ACTIVE",
        offer_type=profile.offer_type,
        object_category=profile.object_category,
        object_type=profile.object_type,
        # Pricing
        price_display=profile.price,
        rent_net=profile.rent_net,
        rent_charges=profile.rent_charges,
        rent_gross=profile.price if profile.offer_type == "RENT" else None,
        # Description
        description_title=profile.title,
        description=profile.description,
        # Dimensions — type coercions
        surface_living=profile.sqm,
        number_of_rooms=str(profile.rooms) if profile.rooms is not None else None,
        floor=profile.floor,
        # Location — set public_address for geocoding (profile.address is already
        # a full formatted address like "Brauerstrasse 29, 8004 Zürich", so using it
        # directly avoids the redundant "{street}, {zipcode} {city}" fallback in
        # geocode_listing which produces broken queries like
        # "Brauerstrasse 29, 8004 Zürich, 8004 Zürich, Switzerland").
        public_address=profile.address,
        street=profile.address,
        zipcode=profile.zipcode,
        city=profile.city,
        latitude=profile.latitude,
        longitude=profile.longitude,
        state=profile.canton,
        country=profile.country,
        # Features — list[str] -> list[FlatfoxAttribute]
        attributes=[FlatfoxAttribute(name=attr) for attr in profile.attributes],
        is_furnished=profile.is_furnished,
        is_temporary=profile.is_temporary,
        # Dates
        year_built=profile.year_built,
        year_renovated=profile.year_renovated,
        moving_date=profile.moving_date,
        moving_date_type=profile.moving_date_type,
    )


def adapt_profile_amenities(profile: ListingProfile) -> dict[str, list[dict]]:
    """Convert ListingProfile amenities to proximity_data dict format.

    The deterministic scorer's score_proximity_quality() expects
    proximity_data as dict[str, list[dict]] where each dict has
    keys: name, distance_km, rating, review_count, address, is_fallback.

    Pre-computed amenity data is never fallback (is_fallback=False).

    Args:
        profile: Pre-computed listing profile with amenities.

    Returns:
        Dict mapping category name to list of amenity dicts.
        Empty dict if profile has no amenities.
    """
    if not profile.amenities:
        return {}

    proximity_data: dict[str, list[dict]] = {}
    for category_name, category in profile.amenities.items():
        proximity_data[category_name] = [
            {
                "name": result.name,
                "distance_km": result.distance_km,
                "rating": result.rating,
                "review_count": result.review_count,
                "address": result.address,
                "is_fallback": False,
            }
            for result in category.results
        ]

    return proximity_data
