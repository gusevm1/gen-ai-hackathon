"""Listings router for Flatfox API proxy.

Provides GET /listings/{pk} endpoint that fetches and returns
parsed listing data from Flatfox's public API.
"""

import httpx
from fastapi import APIRouter, HTTPException

from app.models.listing import FlatfoxListing
from app.services.flatfox import flatfox_client

router = APIRouter(prefix="/listings", tags=["listings"])


@router.get("/{pk}", response_model=FlatfoxListing)
async def get_listing(pk: int):
    """Fetch and parse a Flatfox listing by its pk (primary key).

    Returns structured listing data from Flatfox's public API.

    - 404: Listing not found on Flatfox
    - 502: Flatfox API error or unreachable
    """
    try:
        listing = await flatfox_client.get_listing(pk)
        return listing
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail=f"Listing {pk} not found on Flatfox",
            )
        raise HTTPException(status_code=502, detail="Flatfox API error")
    except httpx.RequestError:
        raise HTTPException(
            status_code=502,
            detail="Could not reach Flatfox API",
        )
