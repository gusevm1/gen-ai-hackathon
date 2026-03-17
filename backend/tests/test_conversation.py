"""Unit tests for conversation service: sentinel parsing, preference mapping, and models."""

import pytest
from pydantic import ValidationError

from app.models.chat import ChatMessage, ChatRequest, ChatResponse
from app.models.preferences import UserPreferences
from app.services.conversation import (
    map_extracted_to_user_preferences,
    parse_preferences_ready,
    strip_preferences_tag,
)
from tests.conftest import (
    SAMPLE_CLAUDE_RESPONSE_NO_PREFS,
    SAMPLE_CLAUDE_RESPONSE_WITH_PREFS,
)


# ---------- parse_preferences_ready ----------


def test_parse_preferences_ready_with_valid_tag():
    """parse_preferences_ready returns (True, dict) when text contains valid sentinel."""
    ready, prefs = parse_preferences_ready(SAMPLE_CLAUDE_RESPONSE_WITH_PREFS)
    assert ready is True
    assert isinstance(prefs, dict)
    assert prefs["location"] == "Zurich"
    assert prefs["offer_type"] == "rent"
    assert prefs["min_price"] == 2000
    assert prefs["max_price"] == 2500


def test_parse_preferences_ready_no_tag():
    """parse_preferences_ready returns (False, None) when no sentinel tag present."""
    ready, prefs = parse_preferences_ready(SAMPLE_CLAUDE_RESPONSE_NO_PREFS)
    assert ready is False
    assert prefs is None


def test_parse_preferences_ready_malformed_json():
    """parse_preferences_ready returns (False, None) when JSON inside tag is malformed."""
    text = "<preferences_ready>not valid json</preferences_ready>"
    ready, prefs = parse_preferences_ready(text)
    assert ready is False
    assert prefs is None


# ---------- strip_preferences_tag ----------


def test_strip_preferences_tag():
    """strip_preferences_tag removes sentinel block and preserves surrounding text."""
    text = "Here is your summary.\n\n<preferences_ready>{\"location\": \"Zurich\"}</preferences_ready>\n\nAnything else?"
    result = strip_preferences_tag(text)
    assert "<preferences_ready>" not in result
    assert "</preferences_ready>" not in result
    assert "Here is your summary." in result
    assert "Anything else?" in result


# ---------- map_extracted_to_user_preferences ----------


def test_map_extracted_rent():
    """Maps offer_type 'rent' to 'RENT'."""
    extracted = {"offer_type": "rent", "object_types": [], "importance": {}}
    mapped = map_extracted_to_user_preferences(extracted)
    assert mapped["offerType"] == "RENT"


def test_map_extracted_buy():
    """Maps offer_type 'buy' to 'SALE'."""
    extracted = {"offer_type": "buy", "object_types": [], "importance": {}}
    mapped = map_extracted_to_user_preferences(extracted)
    assert mapped["offerType"] == "SALE"


def test_map_extracted_house_type():
    """Maps object_types containing 'house' to 'HOUSE'."""
    extracted = {"offer_type": "rent", "object_types": ["house"], "importance": {}}
    mapped = map_extracted_to_user_preferences(extracted)
    assert mapped["objectCategory"] == "HOUSE"


def test_map_extracted_apartment_type():
    """Maps object_types containing 'apartment' to 'APARTMENT'."""
    extracted = {"offer_type": "rent", "object_types": ["apartment"], "importance": {}}
    mapped = map_extracted_to_user_preferences(extracted)
    assert mapped["objectCategory"] == "APARTMENT"


def test_map_extracted_structured_soft_criteria_to_dynamic_fields():
    """Maps structured soft_criteria dicts to dynamicFields and empties softCriteria."""
    extracted = {
        "offer_type": "rent",
        "object_types": [],
        "importance": {},
        "soft_criteria": [
            {"name": "quiet neighborhood", "value": "no traffic", "importance": "high"},
            {"name": "near public transport", "value": "", "importance": "medium"},
        ],
    }
    mapped = map_extracted_to_user_preferences(extracted)
    assert mapped["softCriteria"] == []
    assert len(mapped["dynamicFields"]) == 2
    assert mapped["dynamicFields"][0] == {"name": "quiet neighborhood", "value": "no traffic", "importance": "high"}
    assert mapped["dynamicFields"][1] == {"name": "near public transport", "value": "", "importance": "medium"}


def test_map_extracted_plain_string_soft_criteria_to_dynamic_fields():
    """Falls back gracefully for legacy plain-string soft_criteria."""
    extracted = {
        "offer_type": "rent",
        "object_types": [],
        "importance": {},
        "soft_criteria": ["near Bahnhof", "quiet area"],
    }
    mapped = map_extracted_to_user_preferences(extracted)
    assert mapped["softCriteria"] == []
    assert len(mapped["dynamicFields"]) == 2
    assert mapped["dynamicFields"][0] == {"name": "near Bahnhof", "value": "", "importance": "medium"}
    assert mapped["dynamicFields"][1] == {"name": "quiet area", "value": "", "importance": "medium"}


def test_map_extracted_validates_against_user_preferences():
    """Mapped result validates against UserPreferences without error."""
    extracted = {
        "location": "Zurich",
        "offer_type": "rent",
        "object_types": ["apartment"],
        "min_rooms": 3.0,
        "max_rooms": None,
        "min_living_space": None,
        "max_living_space": None,
        "min_price": 2000,
        "max_price": 2500,
        "price_is_dealbreaker": False,
        "rooms_is_dealbreaker": False,
        "space_is_dealbreaker": False,
        "floor_preference": "any",
        "availability": "any",
        "features": [],
        "soft_criteria": [
            {"name": "quiet neighborhood", "value": "no traffic", "importance": "high"},
        ],
        "importance": {
            "location": "high",
            "price": "high",
            "size": "medium",
            "features": "medium",
            "condition": "medium",
        },
    }
    mapped = map_extracted_to_user_preferences(extracted)
    assert mapped["softCriteria"] == []
    assert len(mapped["dynamicFields"]) == 1
    # Should not raise ValidationError
    prefs = UserPreferences.model_validate(mapped)
    assert prefs.location == "Zurich"
    assert prefs.offer_type.value == "RENT"
    assert prefs.object_category.value == "APARTMENT"
    assert prefs.budget_min == 2000
    assert prefs.budget_max == 2500


# ---------- ChatMessage / ChatRequest / ChatResponse models ----------


def test_chat_request_requires_messages():
    """ChatRequest requires at least one message."""
    with pytest.raises(ValidationError):
        ChatRequest(messages=[], profile_name="test")


def test_chat_request_requires_profile_name():
    """ChatRequest requires profile_name with min_length=1."""
    with pytest.raises(ValidationError):
        ChatRequest(
            messages=[{"role": "user", "content": "hello"}],
            profile_name="",
        )


def test_chat_message_enforces_role():
    """ChatMessage only allows 'user' or 'assistant' roles."""
    with pytest.raises(ValidationError):
        ChatMessage(role="system", content="hello")


def test_chat_response_defaults():
    """ChatResponse has correct defaults."""
    resp = ChatResponse(message="Hello!")
    assert resp.ready_to_summarize is False
    assert resp.extracted_preferences is None
