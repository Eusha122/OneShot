from typing import Literal

from pydantic import BaseModel, Field


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
    history: list[ChatMessage] = Field(default_factory=list)


class VisualBlock(BaseModel):
    id: str
    type: Literal[
        "physics.projectile",
        "math.sineGraph",
        "physics.forceMotion",
        "physics.engineLab",
        "math.quadraticGraph",
    ]
    params: dict[str, float | str]


class ChatResponse(BaseModel):
    content: str
    visual_blocks: list[VisualBlock] = Field(default_factory=list)
    model: str
