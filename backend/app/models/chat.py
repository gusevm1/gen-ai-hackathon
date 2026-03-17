"""Pydantic models for the AI chat conversation endpoint."""

from typing import Literal, Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(default_factory=list)
    profile_name: str = Field(default="", max_length=100)


class ChatResponse(BaseModel):
    message: str
    ready_to_summarize: bool = False
    extracted_preferences: Optional[dict] = None
