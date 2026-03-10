"""Pydantic models for Flatfox public listing API response.

Endpoint: GET /api/v1/public-listing/{pk}/
No authentication required.

Field types verified against live Flatfox API (2026-03-10).
"""

from pydantic import BaseModel, Field
from typing import Optional


class FlatfoxAgencyLogo(BaseModel):
    """Agency logo URLs."""

    url: str
    url_org_logo_m: Optional[str] = None


class FlatfoxAgency(BaseModel):
    """Agency information from Flatfox listing."""

    name: Optional[str] = None
    name_2: Optional[str] = None
    street: Optional[str] = None
    zipcode: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    logo: Optional[FlatfoxAgencyLogo] = None


class FlatfoxAttribute(BaseModel):
    """A single listing attribute/feature (e.g., balcony, parking)."""

    name: str


class FlatfoxListing(BaseModel):
    """Pydantic model for Flatfox public listing API response.

    Endpoint: GET /api/v1/public-listing/{pk}/
    No authentication required.

    All field types match the verified live API response structure.
    """

    pk: int
    slug: str
    url: str
    short_url: str
    status: str
    offer_type: str  # "RENT" or "SALE"
    object_category: str  # "APARTMENT", "HOUSE", "PARK", "INDUSTRY"
    object_type: str  # "APARTMENT", "SINGLE_HOUSE", "GARAGE_SLOT", etc.

    # Pricing
    price_display: Optional[int] = None
    price_display_type: Optional[str] = None
    price_unit: Optional[str] = None  # "monthly"
    rent_net: Optional[int] = None
    rent_charges: Optional[int] = None
    rent_gross: Optional[int] = None

    # Titles and description
    short_title: Optional[str] = None
    public_title: Optional[str] = None
    pitch_title: Optional[str] = None
    description_title: Optional[str] = None
    description: Optional[str] = None

    # Dimensions
    surface_living: Optional[int] = None
    surface_property: Optional[int] = None
    surface_usable: Optional[int] = None
    number_of_rooms: Optional[str] = None  # NOTE: string, e.g. "3.5"
    floor: Optional[int] = None

    # Location
    street: Optional[str] = None
    zipcode: Optional[int] = None
    city: Optional[str] = None
    public_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    state: Optional[str] = None  # Canton code, e.g. "ZH", "BE"
    country: Optional[str] = None  # "CH"

    # Features
    attributes: list[FlatfoxAttribute] = Field(default_factory=list)
    is_furnished: bool = False
    is_temporary: bool = False

    # Dates
    year_built: Optional[int] = None
    year_renovated: Optional[int] = None
    moving_date_type: Optional[str] = None  # "imm" (immediate), "agr" (by agreement)
    moving_date: Optional[str] = None
    published: Optional[str] = None
    created: Optional[str] = None

    # Media (image IDs, not URLs)
    cover_image: Optional[int] = None
    images: list[int] = Field(default_factory=list)
    documents: list[int] = Field(default_factory=list)
    video_url: Optional[str] = None
    tour_url: Optional[str] = None

    # Agency
    agency: Optional[FlatfoxAgency] = None
    reserved: bool = False
