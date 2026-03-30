"""Pydantic models for pre-computed listing profiles.

A ListingProfile contains all data extracted by the research agent:
- Objective listing data from Flatfox API
- AI-analyzed condition scores from images
- AI-researched neighborhood data from web search
- Pre-fetched proximity data from Google Places
- Swiss-specific market context
- Free-text research notes

Used by the deterministic scoring engine to produce ScoreResponse
without per-user LLM calls.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class AmenityResult(BaseModel):
    """A single nearby amenity from Google Places."""

    name: str
    distance_km: Optional[float] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    address: Optional[str] = None
    type: Optional[str] = None  # e.g. "tram", "bus", "S-Bahn" for transport


class AmenityCategory(BaseModel):
    """Pre-fetched amenity results for a single category."""

    results: list[AmenityResult] = Field(default_factory=list)

    @property
    def nearest_km(self) -> Optional[float]:
        """Distance to the nearest amenity in this category."""
        distances = [r.distance_km for r in self.results if r.distance_km is not None]
        return min(distances) if distances else None

    @property
    def count_within(self) -> int:
        """Number of amenities found."""
        return len(self.results)


class ListingProfile(BaseModel):
    """Comprehensive pre-computed listing profile.

    Built by the research agent (Layer 1) and consumed by the
    deterministic scoring engine (Layer 2).
    """

    # ── Objective data (from Flatfox API + scraping) ──────────────────
    listing_id: int
    slug: str = ""
    title: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    zipcode: Optional[int] = None
    canton: Optional[str] = None  # e.g. "ZH", "BE"
    country: str = "CH"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    price: Optional[int] = None  # rent_gross or purchase price
    rent_net: Optional[int] = None
    rent_charges: Optional[int] = None
    rooms: Optional[float] = None
    sqm: Optional[int] = None  # surface_living
    floor: Optional[int] = None
    year_built: Optional[int] = None
    year_renovated: Optional[int] = None
    offer_type: str = "RENT"  # "RENT" or "SALE"
    object_category: str = "APARTMENT"
    object_type: str = "APARTMENT"
    is_furnished: bool = False
    is_temporary: bool = False
    moving_date: Optional[str] = None
    moving_date_type: Optional[str] = None
    attributes: list[str] = Field(default_factory=list)  # e.g. ["balcony", "parking"]
    image_urls: list[str] = Field(default_factory=list)
    description: Optional[str] = None

    # ── AI-analyzed condition (from images) ───────────────────────────
    condition_score: Optional[int] = Field(None, ge=0, le=100)
    natural_light_score: Optional[int] = Field(None, ge=0, le=100)
    kitchen_quality_score: Optional[int] = Field(None, ge=0, le=100)
    bathroom_quality_score: Optional[int] = Field(None, ge=0, le=100)
    interior_style: Optional[Literal["modern", "classic", "renovated", "dated"]] = None
    maintenance_notes: list[str] = Field(default_factory=list)

    # ── AI-researched neighborhood (from web search + maps) ──────────
    neighborhood_character: Optional[str] = None  # e.g. "urban center", "quiet residential"
    noise_level_estimate: Optional[int] = Field(None, ge=0, le=100)
    family_friendly_score: Optional[int] = Field(None, ge=0, le=100)
    nightlife_proximity_score: Optional[int] = Field(None, ge=0, le=100)
    green_space_score: Optional[int] = Field(None, ge=0, le=100)

    # ── Pre-fetched proximity data (from Google Places) ──────────────
    amenities: dict[str, AmenityCategory] = Field(default_factory=dict)
    # Keys: "supermarket", "public_transport", "school", "gym", "restaurant",
    #        "park", "hospital", "kindergarten", "pharmacy", etc.

    # ── Swiss-specific context ───────────────────────────────────────
    canton_tax_rate: Optional[float] = None
    avg_rent_for_area: Optional[float] = None
    price_vs_market: Optional[Literal["below", "at", "above"]] = None

    # ── Free-text research notes ─────────────────────────────────────
    highlights: list[str] = Field(default_factory=list)
    concerns: list[str] = Field(default_factory=list)
    description_summary: Optional[str] = None

    # ── Metadata ─────────────────────────────────────────────────────
    analyzed_at: Optional[datetime] = None
    flatfox_last_updated: Optional[str] = None
    profile_version: int = 1

    def get_amenity_distance(self, category: str) -> Optional[float]:
        """Get distance to nearest amenity in a category.

        Args:
            category: Amenity category key (e.g. "supermarket", "gym").

        Returns:
            Distance in km to nearest, or None if no data.
        """
        cat = self.amenities.get(category)
        if cat:
            return cat.nearest_km
        return None

    def has_amenity_within(self, category: str, radius_km: float) -> Optional[bool]:
        """Check if an amenity exists within a given radius.

        Args:
            category: Amenity category key.
            radius_km: Maximum distance in km.

        Returns:
            True if within radius, False if not, None if no data.
        """
        dist = self.get_amenity_distance(category)
        if dist is None:
            return None
        return dist <= radius_km

    def get_effective_price(self) -> Optional[int]:
        """Get the relevant price for scoring (gross rent or purchase price)."""
        return self.price
