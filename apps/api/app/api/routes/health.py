from datetime import UTC, datetime

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
@router.get("/api/health")
def health_check() -> dict[str, str]:
    return {
        "status": "healthy",
        "service": "OneShot API",
        "timestamp": datetime.now(UTC).isoformat(),
    }
