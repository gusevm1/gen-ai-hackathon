"""Geocoding router — resolves location text to bounding box coordinates."""

import logging
import re

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.apify import geocode_location

logger = logging.getLogger(__name__)

router = APIRouter(tags=["geocoding"])


class GeocodeRequest(BaseModel):
    location: str


class BoundingBox(BaseModel):
    north: float
    south: float
    east: float
    west: float


class GeocodeResponse(BaseModel):
    query: str
    boundingBox: BoundingBox | None = None


@router.post("/geocode")
async def geocode(req: GeocodeRequest) -> GeocodeResponse:
    """Geocode a location string into a bounding box.

    Splits multi-location strings (e.g. "Kreis 4 and Kreis 5") and
    merges bounding boxes to cover all segments.
    """
    segments = re.split(r"\s+and\s+|[,;]", req.location)
    segments = [s.strip() for s in segments if s.strip()]

    if not segments:
        return GeocodeResponse(query=req.location, boundingBox=None)

    # If segments look like partial names (e.g. "Kreis 4"), append ", Zürich, Switzerland"
    enriched = []
    for seg in segments:
        seg_lower = seg.lower()
        if "zürich" not in seg_lower and "zurich" not in seg_lower and "switzerland" not in seg_lower:
            enriched.append(f"{seg}, Zürich, Switzerland")
        else:
            enriched.append(seg)

    # Geocode each segment
    merged_south = float("inf")
    merged_north = float("-inf")
    merged_west = float("inf")
    merged_east = float("-inf")
    any_result = False

    for segment in enriched:
        result = await geocode_location(segment)
        if result and result.get("boundingBox"):
            bb = result["boundingBox"]  # [south, north, west, east]
            merged_south = min(merged_south, bb[0])
            merged_north = max(merged_north, bb[1])
            merged_west = min(merged_west, bb[2])
            merged_east = max(merged_east, bb[3])
            any_result = True

    if not any_result:
        return GeocodeResponse(query=req.location, boundingBox=None)

    return GeocodeResponse(
        query=req.location,
        boundingBox=BoundingBox(
            north=merged_north,
            south=merged_south,
            east=merged_east,
            west=merged_west,
        ),
    )
