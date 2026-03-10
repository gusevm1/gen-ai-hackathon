"""Supabase Python client for reading preferences and writing analysis results.

Uses service_role key to bypass RLS -- user identity is verified by the
edge function layer upstream.

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

    def get_preferences(self, user_id: str) -> dict:
        """Read user preferences from Supabase.

        Args:
            user_id: The Supabase user UUID.

        Returns:
            Preferences dict (camelCase keys as stored in JSONB).

        Raises:
            Exception: If no preferences found for user.
        """
        client = self.get_client()
        result = (
            client.table("user_preferences")
            .select("preferences")
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return result.data["preferences"]

    def save_analysis(
        self, user_id: str, listing_id: str, score_data: dict
    ) -> None:
        """Save or update an analysis result in Supabase.

        Uses upsert with unique(user_id, listing_id) constraint.

        Args:
            user_id: The Supabase user UUID.
            listing_id: The Flatfox listing PK as string.
            score_data: The full ScoreResponse dict (stored in breakdown JSONB).
        """
        client = self.get_client()
        client.table("analyses").upsert(
            {
                "user_id": user_id,
                "listing_id": listing_id,
                "score": score_data["overall_score"],
                "breakdown": score_data,
                "summary": "\n".join(score_data.get("summary_bullets", [])),
            }
        ).execute()


# Singleton instance used by routers and lifespan
supabase_service = SupabaseService()
