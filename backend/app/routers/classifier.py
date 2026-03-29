"""FastAPI router for POST /classify-criteria.

Accepts a list of DynamicField objects and returns them enriched with
criterion_type via a single batched Claude classification call.
"""

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.models.preferences import DynamicField
from app.services.classifier import criterion_classifier

router = APIRouter(prefix="/classify-criteria", tags=["classification"])


class ClassifyRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    dynamic_fields: list[DynamicField]


class ClassifyResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    dynamic_fields: list[DynamicField]


@router.post("", response_model=ClassifyResponse, response_model_by_alias=True)
async def classify_criteria(request: ClassifyRequest) -> ClassifyResponse:
    """Classify DynamicField criteria into criterion types via Claude."""
    enriched = await criterion_classifier.classify_fields(request.dynamic_fields)
    return ClassifyResponse(dynamic_fields=enriched)
