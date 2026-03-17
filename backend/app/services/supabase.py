"""Supabase Python client for writing analysis results.

Uses service_role key to bypass RLS -- user identity is verified by the
edge function layer upstream. Preferences are passed from the edge function
(no longer queried from DB).

Follows the singleton pattern established by FlatfoxClient.
"""

import os

from supabase import create_client, Client


class SupabaseService:
    """Synchronous Supabase client for database operations.

    Note: supabase-py is synchronous. In async FastAPI endpoints,
    wrap calls with asyncio.to_thread() to avoid blocking the event loop.
    """

    def __init__(self) -> None:
        self._client: Client | None = None

    def get_client(self) -> Client:
        """Get or create the Supabase client (lazy initialization).

        Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from environment.
        """
        if self._client is None:
            self._client = create_client(
                os.environ["SUPABASE_URL"],
                os.environ["SUPABASE_SERVICE_ROLE_KEY"],
            )
        return self._client

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


# Singleton instance used by routers and lifespan
supabase_service = SupabaseService()
