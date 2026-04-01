"""Pydantic models for neighborhood POI and analysis data."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class NeighborhoodPOI(BaseModel):
    id: int | None = None
    osm_id: int
    osm_type: str
    name: str | None = None
    category: str
    category_group: str
    lat: float
    lon: float
    tags: dict = Field(default_factory=dict)


class POICounts(BaseModel):
    """Category counts within a radius."""
    counts: dict[str, int] = Field(default_factory=dict)
    total: int = 0


class NeighborhoodAnalysis(BaseModel):
    id: int | None = None
    cell_id: int
    lat: float
    lon: float
    radius_m: int = 500
    poi_counts: dict = Field(default_factory=dict)
    total_pois: int = 0
    neighborhood_character: str | None = None
    noise_level_estimate: int | None = None
    family_friendly_score: int | None = None
    nightlife_proximity_score: int | None = None
    green_space_score: int | None = None
    transit_score: int | None = None
    dining_score: int | None = None
    summary: str | None = None
    highlights: list[str] = Field(default_factory=list)
    concerns: list[str] = Field(default_factory=list)
    model_used: str | None = None
    analyzed_at: datetime | None = None
    updated_at: datetime | None = None


class NeighborhoodResponse(BaseModel):
    """API response combining POI counts and cached analysis."""
    lat: float
    lon: float
    radius_m: int
    poi_counts: dict[str, int] = Field(default_factory=dict)
    total_pois: int = 0
    analysis: NeighborhoodAnalysis | None = None
    analysis_distance_m: float | None = None
