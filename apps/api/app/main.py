from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.chat import router as chat_router
from app.api.routes.health import router as health_router
from app.api.routes.learners import router as learners_router
from app.api.routes.conversations import router as conversations_router
from app.api.routes.documents import router as documents_router
from app.api.routes.rag import router as rag_router
from app.api.routes.exams import router as exams_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.assessment import router as assessment_router
from app.api.routes.docs import router as docs_router
from app.core.config import settings
from app.core.storage import init_storage
from app.db.database import sessionmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_storage()
    
    import logging
    import asyncio
    from app.services.ai.ai_router import ai_router
    from app.core.inference_settings import inference_settings
    logger = logging.getLogger(__name__)

    provider = inference_settings.ai_provider
    logger.info("[STARTUP] AI provider: %s", provider)

    if provider in ("local", "fallback"):
        try:
            logger.info("[STARTUP] Validating Ollama inference service...")
            await asyncio.wait_for(ai_router._ollama.check_health(), timeout=5.0)
            logger.info("[STARTUP] Ollama is healthy.")
        except Exception as e:
            if provider == "fallback":
                logger.warning("[STARTUP] Ollama degraded (%s). Cloud fallback will be used.", e)
            else:
                logger.critical("[STARTUP] Ollama unavailable: %s. AI features disabled.", e)

    if provider in ("production", "fallback"):
        try:
            logger.info("[STARTUP] Validating cloud AI endpoint...")
            await asyncio.wait_for(ai_router._get_cloud().check_health(), timeout=10.0)
            logger.info("[STARTUP] Cloud AI is healthy.")
        except Exception as e:
            logger.warning("[STARTUP] Cloud AI health check failed: %s", e)

    yield
    if sessionmanager._engine is not None:
        await sessionmanager.close()
    await ai_router.close()


def create_app() -> FastAPI:
    app = FastAPI(
        title="AI Visual Learning Platform API",
        version="0.1.0",
        description="Backend foundation for local AI, RAG, and visual learning workflows.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    print(f"✅ CORS enabled for origins: {settings.cors_origins}")

    app.include_router(health_router)
    app.include_router(chat_router)
    app.include_router(learners_router, prefix="/api/learners", tags=["learners"])
    app.include_router(conversations_router, prefix="/api/conversations", tags=["conversations"])
    app.include_router(documents_router)
    app.include_router(rag_router)
    app.include_router(exams_router, prefix="/api/exams", tags=["exams"])
    app.include_router(analytics_router, prefix="/api/analytics", tags=["analytics"])
    app.include_router(assessment_router)
    app.include_router(docs_router)
    return app


app = create_app()
