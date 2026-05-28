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
from app.core.config import settings
from app.core.storage import init_storage
from app.db.database import sessionmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_storage()
    yield
    if sessionmanager._engine is not None:
        await sessionmanager.close()


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

    app.include_router(health_router)
    app.include_router(chat_router)
    app.include_router(learners_router, prefix="/api/learners", tags=["learners"])
    app.include_router(conversations_router, prefix="/api/conversations", tags=["conversations"])
    app.include_router(documents_router)
    app.include_router(rag_router)
    app.include_router(exams_router, prefix="/api/exams", tags=["exams"])
    return app


app = create_app()
