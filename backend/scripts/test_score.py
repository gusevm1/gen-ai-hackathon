"""Quick test: run _score_with_profile and dump the full response."""
import asyncio
import json
import logging

logging.basicConfig(level=logging.DEBUG, format="%(name)s %(levelname)s: %(message)s")

from app.models.preferences import UserPreferences
from app.services.listing_profile_db import get_listing_profile
from app.routers.scoring import _score_with_profile

profile = get_listing_profile(85916189)

prefs = UserPreferences.model_validate({
    "budget_max": 2500,
    "budget_ideal": 2000,
    "min_rooms": 3,
    "min_size_sqm": 70,
    "location_preference": "Zurich",
    "dynamic_fields": [
        {"name": "Starbucks", "value": "starbucks within 3km", "importance": "high"},
        {"name": "Migros", "value": "migros within 5km radius", "importance": "high"},
        {"name": "natural light", "value": "lots of natural light", "importance": "high"},
    ],
})

result = asyncio.run(_score_with_profile(profile, prefs))
print("=== SCORE RESPONSE ===")
print(json.dumps(result.model_dump(), indent=2, default=str))
