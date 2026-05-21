from app.schemas.chat import VisualBlock


def infer_visual_blocks(message: str) -> list[VisualBlock]:
    normalized = message.lower()
    blocks: list[VisualBlock] = []

    if any(keyword in normalized for keyword in ["projectile", "trajectory", "motion", "gravity"]):
        blocks.append(
            VisualBlock(
                id="visual-projectile-response",
                type="physics.projectile",
                params={"speed": 32, "angleDegrees": 42, "gravity": 9.8},
            )
        )

    if any(keyword in normalized for keyword in ["sine", "sin(", "sin ", "wave"]):
        blocks.append(
            VisualBlock(
                id="visual-sine-response",
                type="math.sineGraph",
                params={"amplitude": 1.4, "frequency": 1, "phase": 0},
            )
        )

    return blocks
