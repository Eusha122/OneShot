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
    from app.services.ai.ollama_client import ollama_client, InfrastructureError
    import time
    
    start_time = time.time()
    try:
        health_data = await ollama_client.check_health()
        latency_ms = int((time.time() - start_time) * 1000)
        cooldown = ollama_client.cooldown_until.replace(tzinfo=UTC) if ollama_client.cooldown_until else None
        return {
            "ollama": "healthy",
            "model": ollama_client.model,
            "latency_ms": latency_ms,
            "last_failure": cooldown.isoformat() if cooldown else None,
            "circuit_breaker_active": bool(cooldown and datetime.now(UTC) < cooldown)
        }
    except InfrastructureError as e:
        cooldown = ollama_client.cooldown_until.replace(tzinfo=UTC) if ollama_client.cooldown_until else None
        circuit_breaker_active = cooldown is not None and datetime.now(UTC) < cooldown
        return {
            "ollama": "degraded",
            "model": ollama_client.model,
            "latency_ms": None,
            "error": str(e),
            "last_failure": cooldown.isoformat() if cooldown else datetime.now(UTC).isoformat(),
            "circuit_breaker_active": circuit_breaker_active
        }
