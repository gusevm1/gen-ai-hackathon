"""Neighborhood POI and analysis endpoints."""

import asyncio
import logging

from fastapi import APIRouter, Query

from app.models.neighborhood import NeighborhoodPOI, NeighborhoodResponse
from app.services import neighborhood_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/neighborhood", tags=["neighborhood"])


@router.get("/pois")
async def get_poi_counts(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    radius_m: float = Query(500, description="Radius in meters"),
) -> dict:
    """Return POI counts by category within radius."""
    counts = await asyncio.to_thread(
        neighborhood_db.count_pois_by_category, lat, lon, radius_m
    )
    total = sum(counts.values())
    return {
        "lat": lat,
        "lon": lon,
        "radius_m": radius_m,
        "poi_counts": counts,
        "total_pois": total,
    }


@router.get("/analysis")
async def get_neighborhood_analysis(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    radius_m: float = Query(500, description="Radius for POI counts"),
) -> NeighborhoodResponse:
    """Return POI counts + nearest cached LLM analysis."""
    counts, (analysis, dist) = await asyncio.gather(
        asyncio.to_thread(neighborhood_db.count_pois_by_category, lat, lon, radius_m),
        asyncio.to_thread(neighborhood_db.get_nearest_analysis, lat, lon),
    )
    total = sum(counts.values())

    return NeighborhoodResponse(
        lat=lat,
        lon=lon,
        radius_m=radius_m,
        poi_counts=counts,
        total_pois=total,
        analysis=analysis,
        analysis_distance_m=dist,
    )


@router.get("/pois/list")
async def list_pois(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    radius_m: float = Query(500, description="Radius in meters"),
    category_group: str | None = Query(None, description="Filter by category group"),
    category: str | None = Query(None, description="Filter by category"),
    limit: int = Query(200, le=1000, description="Max results"),
) -> list[NeighborhoodPOI]:
    """Return individual POIs within radius (for map display)."""
    return await asyncio.to_thread(
        neighborhood_db.query_pois_in_radius,
        lat, lon, radius_m, category_group, category, limit,
    )
