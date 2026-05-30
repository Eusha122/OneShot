from typing import Literal, Any
from enum import Enum

from pydantic import BaseModel, Field, field_validator


LearningMode = Literal[
    "explain_simply",
    "exam_mode",
    "visual_mode",
    "step_by_step",
    "fast_revision",
    "challenge_me",
]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    learning_mode: LearningMode = "visual_mode"
    conversation_id: int | None = None
    history: list[ChatMessage] = Field(default_factory=list)
    active_document_ids: list[int] | None = None
    subject: str | None = "auto"


class VisualizeRequest(BaseModel):
    query: str
    context: str = ""


class VisualBlockType(str, Enum):
    # Physics
    PHYSICS_PROJECTILE = "physics.projectile"
    PHYSICS_FORCE_MOTION = "physics.forceMotion"
    PHYSICS_ENGINE_LAB = "physics.engineLab"
    PHYSICS_VELOCITY_GRAPH = "physics.velocityGraph"

    # Math
    MATH_SINE_GRAPH = "math.sineGraph"
    MATH_QUADRATIC_GRAPH = "math.quadraticGraph"
    MATH_LINEAR_GRAPH = "math.linearGraph"

    # Geometry
    GEOMETRY_TRIANGLE = "geometry.triangle"
    GEOMETRY_CIRCLE = "geometry.circle"
    GEOMETRY_PARALLEL_LINES = "geometry.parallelLines"
    GEOMETRY_ANGLE_SUM = "geometry.angleSum"

    # Exam
    EXAM_SUMMARY = "exam_summary"


class VisualBlock(BaseModel):
    id: str
    type: str  # Accept any string; validated below
    params: dict[str, Any]

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        # Accept any known enum value, but also allow unknown types gracefully
        known = {e.value for e in VisualBlockType}
        if v not in known:
            import logging
            logging.getLogger(__name__).warning(
                f"[VISUAL BLOCK] Unknown block type '{v}' — will pass through for frontend fallback"
            )
        return v


class ChatResponse(BaseModel):
    content: str
    visual_blocks: list[VisualBlock] | None = None
    sources: list[str] | None = None
    model: str
    resolved_subject: str | None = None


class ExamTransitionRequest(BaseModel):
    exam_results: list[dict]
    history: list[ChatMessage] = Field(default_factory=list)
    learning_mode: LearningMode = "visual_mode"
    request_id: str | None = None
