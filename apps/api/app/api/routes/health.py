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

@router.get("/api/system/inference-status")
async def inference_status():
    from app.services.ai.ai_router import ai_router
    from app.services.ai.ollama_client import InfrastructureError
    import time

    start_time = time.time()
    try:
        health_data = await ai_router.check_health()
        latency_ms = int((time.time() - start_time) * 1000)
        cooldown = ai_router.cooldown_until
        if cooldown:
            cooldown = cooldown.replace(tzinfo=UTC)
        return {
            **health_data,
            "latency_ms": latency_ms,
            "circuit_breaker_active": bool(cooldown and datetime.now(UTC) < cooldown),
            "last_failure": cooldown.isoformat() if cooldown else None,
        }
    except Exception as e:
        cooldown = ai_router.cooldown_until
        if cooldown:
            cooldown = cooldown.replace(tzinfo=UTC)
        return {
            "provider": ai_router.provider,
            "status": "degraded",
            "error": str(e),
            "latency_ms": None,
            "circuit_breaker_active": bool(cooldown and datetime.now(UTC) < cooldown),
            "last_failure": cooldown.isoformat() if cooldown else datetime.now(UTC).isoformat(),
        }
