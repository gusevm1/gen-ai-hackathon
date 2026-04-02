"""Supabase Python client for writing analysis results.

Uses service_role key to bypass RLS -- user identity is verified by the
edge function layer upstream. Preferences are passed from the edge function
(no longer queried from DB).

Follows the singleton pattern established by FlatfoxClient.
"""

import os
import threading

from supabase import create_client, Client


class SupabaseService:
    """Synchronous Supabase client for database operations.

    Note: supabase-py is synchronous. In async FastAPI endpoints,
    wrap calls with asyncio.to_thread() to avoid blocking the event loop.
    """

    def __init__(self) -> None:
        self._client: Client | None = None
        self._lock = threading.Lock()

    def get_client(self) -> Client:
        """Get or create the Supabase client (lazy initialization).

        Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from environment.
        """
        with self._lock:
            if self._client is None:
                self._client = create_client(
                    os.environ["SUPABASE_URL"],
                    os.environ["SUPABASE_SERVICE_ROLE_KEY"],
                )
            return self._client

    def reset_client(self) -> None:
        """Force-recreate the client on next get_client() call.

        Call this after catching HTTP/2 connection errors to get a fresh
        connection pool.
        """
        with self._lock:
            self._client = None

    def get_analysis(
        self, user_id: str, profile_id: str, listing_id: str
    ) -> dict | None:
        """Retrieve an existing analysis from Supabase.

        Returns the breakdown dict if found, or None if no analysis exists.

        Args:
            user_id: The Supabase user UUID.
            profile_id: The active profile UUID.
            listing_id: The Flatfox listing PK as string.
        """
        client = self.get_client()
        result = (
            client.table("analyses")
            .select("breakdown")
            .eq("user_id", user_id)
            .eq("listing_id", listing_id)
            .eq("profile_id", profile_id)
            .maybeSingle()
            .execute()
        )
        if result.data:
            breakdown = result.data.get("breakdown")
            # DB-02: Reject stale v1 cache entries -- require schema_version >= 2
            if breakdown and breakdown.get("schema_version", 0) >= 2:
                return breakdown
        return None

    def save_analysis(
        self, user_id: str, profile_id: str, listing_id: str, score_data: dict
    ) -> None:
        """Save or update an analysis result in Supabase.

        Uses upsert with unique(user_id, listing_id, profile_id) constraint.

        Args:
            user_id: The Supabase user UUID.
            profile_id: The active profile UUID.
            listing_id: The Flatfox listing PK as string.
            score_data: The full ScoreResponse dict (stored in breakdown JSONB).
        """
        client = self.get_client()
        client.table("analyses").upsert(
            {
                "user_id": user_id,
                "profile_id": profile_id,
                "listing_id": listing_id,
                "score": score_data["overall_score"],
                "breakdown": score_data,
                "summary": "\n".join(score_data.get("summary_bullets", [])),
                "stale": False,
            },
            on_conflict="user_id,listing_id,profile_id",
        ).execute()

    def get_nearby_places_cache(
        self,
        lat: float,
        lon: float,
        query: str,
        radius_km: float,
    ) -> list[dict] | None:
        """Retrieve cached nearby places result for (lat, lon, query, radius_km).

        Returns the cached list of place dicts if a fresh entry (< 7 days) exists.
        Returns None on cache miss or any error.

        TTL is computed in Python (not raw SQL) for supabase-py compatibility.
        """
        from datetime import datetime, timedelta, timezone
        threshold = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        client = self.get_client()
        result = (
            client.table("nearby_places_cache")
            .select("response_json")
            .eq("lat", lat)
            .eq("lon", lon)
            .eq("query", query)
            .eq("radius_km", radius_km)
            .gte("created_at", threshold)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0].get("response_json")
        return None

    def save_nearby_places_cache(
        self,
        lat: float,
        lon: float,
        query: str,
        radius_km: float,
        results: list[dict],
    ) -> None:
        """Insert nearby places results into cache.

        Uses insert (not upsert) — multiple entries per key are allowed;
        get_nearby_places_cache reads only the most recent within TTL.

        Args:
            lat: Listing latitude.
            lon: Listing longitude.
            query: The search query string.
            radius_km: Search radius in km.
            results: List of place dicts to cache as JSONB.
        """
        client = self.get_client()
        client.table("nearby_places_cache").insert(
            {
                "lat": lat,
                "lon": lon,
                "query": query,
                "radius_km": radius_km,
                "response_json": results,
            }
        ).execute()


# Singleton instance used by routers and lifespan
supabase_service = SupabaseService()
