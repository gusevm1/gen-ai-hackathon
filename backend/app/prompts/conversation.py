"""System prompt builder for Swiss property advisor conversation.

Stub implementation -- fully built out in Task 2.
"""


def build_conversation_system_prompt(profile_name: str = "") -> str:
    """Build the system prompt for the property advisor conversation."""
    return f"You are a Swiss property search advisor helping {profile_name or 'a user'} find their ideal home."
