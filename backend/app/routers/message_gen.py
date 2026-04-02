"""Message generation router -- AI-drafted contact messages for Quick Apply."""

import logging
import os

from anthropic import AsyncAnthropic
from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

CHAT_MODEL = os.environ.get("CHAT_MODEL", "claude-sonnet-4-6")
_client: AsyncAnthropic | None = None


def get_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        _client = AsyncAnthropic()
    return _client


class GenerateMessageRequest(BaseModel):
    listing_id: str
    listing_address: str
    listing_type: str
    profile_name: str
    key_preferences: list[str]
    move_in_intent: str


class GenerateMessageResponse(BaseModel):
    message: str


SYSTEM_PROMPT = """Du hilfst Wohnungssuchenden dabei, persönliche Kontaktnachrichten an Vermieter auf Flatfox zu schreiben.
Schreibe eine höfliche, persönliche Anfrage auf Deutsch (ca. 80-100 Wörter).
Die Nachricht soll:
- Den Namen der Person verwenden
- Sich auf die spezifische Wohnung beziehen
- 1-2 wichtige Präferenzen oder den Einzugswunsch erwähnen
- Professionell und freundlich klingen
- Kein Betreff, nur der Nachrichtentext
Variiere den Ton und Aufbau leicht bei jeder Anfrage."""


@router.post("/generate-message", response_model=GenerateMessageResponse)
async def generate_message(req: GenerateMessageRequest) -> GenerateMessageResponse:
    """Generate a personalized contact message draft using Claude."""
    prefs_text = ", ".join(req.key_preferences) if req.key_preferences else "keine speziellen Anforderungen"

    user_prompt = f"""Person: {req.profile_name}
Wohnung: {req.listing_type} an {req.listing_address}
Wichtige Präferenzen: {prefs_text}
Einzugswunsch: {req.move_in_intent if req.move_in_intent else "so bald wie möglich"}

Schreibe eine Kontaktanfrage für diese Wohnung."""

    try:
        response = await get_client().messages.create(
            model=CHAT_MODEL,
            max_tokens=300,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        message_text = response.content[0].text.strip()
        return GenerateMessageResponse(message=message_text)
    except Exception as e:
        logger.error(f"Message generation failed: {e}")
        # Fallback to a simple template
        fallback = (
            f"Sehr geehrte Damen und Herren,\n\n"
            f"ich bin {req.profile_name} und interessiere mich sehr für Ihre {req.listing_type} "
            f"an der Adresse {req.listing_address}.\n\n"
            f"Über eine Besichtigung würde ich mich sehr freuen.\n\n"
            f"Mit freundlichen Grüssen,\n{req.profile_name}"
        )
        return GenerateMessageResponse(message=fallback)
