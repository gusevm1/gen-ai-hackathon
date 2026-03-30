#!/usr/bin/env python3
"""Compute haversine distances from a point to categorized amenities.

Usage:
    echo '{"public_transport": [{"name": "Tram 4", "lat": 47.38, "lng": 8.53}]}' | \
        python3 backend/scripts/haversine.py 47.385 8.518

Input JSON: categorized amenities, each with lat/lng.
Output JSON: same structure with distance_m added, sorted by distance per category.
"""

import json
import math
import sys


def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> int:
    """Return distance in meters between two lat/lng points."""
    R = 6_371_000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return int(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 haversine.py <lat> <lng> < amenities.json", file=sys.stderr)
        sys.exit(1)

    lat = float(sys.argv[1])
    lng = float(sys.argv[2])
    data = json.load(sys.stdin)

    result = {}
    for category, items in data.items():
        if not isinstance(items, list):
            result[category] = items
            continue
        enriched = []
        for item in items:
            if not isinstance(item, dict):
                continue
            item_lat = item.get("lat")
            item_lng = item.get("lng")
            if item_lat is not None and item_lng is not None:
                try:
                    item["distance_m"] = haversine(lat, lng, float(item_lat), float(item_lng))
                except (ValueError, TypeError):
                    pass
            enriched.append(item)
        enriched.sort(key=lambda x: x.get("distance_m", 999_999))
        result[category] = enriched

    json.dump(result, sys.stdout, indent=2, ensure_ascii=False)
    print()


if __name__ == "__main__":
    main()
