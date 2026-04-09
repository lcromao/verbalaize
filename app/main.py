import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

from app.core.config import settings
from app.middleware.token import AppSecretMiddleware
from app.routes import models, transcription
from app.schemas.transcription import ModelType
from app.services.whisper_service import get_whisper_service

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
# Silence noisy third-party debug loggers
logging.getLogger("python_multipart").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Preload models on startup to avoid first-request delays."""
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    if settings.disable_startup_preload:
        logger.info("Startup preload disabled by configuration")
        yield
        return

    try:
        logger.info("Preloading Whisper models...")
        whisper_service = get_whisper_service()
        await whisper_service._get_model(ModelType.TURBO)
        logger.info("Models preloaded successfully - ready for transcription")
    except Exception as e:
        logger.warning(f"Model preload warning: {str(e)}")
        logger.info("Models will be loaded on first use")
    yield


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Audio transcription service using OpenAI Whisper",
    debug=settings.debug,
    lifespan=lifespan,
)

# Secret token middleware (desktop mode only — no-op when VBZ_APP_SECRET is unset)
if settings.app_secret:
    app.add_middleware(AppSecretMiddleware, secret=settings.app_secret)
    logger.info("AppSecretMiddleware enabled")
else:
    logger.info("AppSecretMiddleware disabled (VBZ_APP_SECRET not set)")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.resolved_cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-App-Secret"],
)

# Include routers
app.include_router(transcription.router, prefix="/api")
app.include_router(models.router, prefix="/api")


@app.get("/health")
async def health_check_root():
    """Health check at root, used by frontend"""
    return {"status": "healthy", "service": "verbalaize-api"}


@app.get("/api")
async def root():
    """Root endpoint with API information"""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "message": "Welcome to Verbalaize Audio Transcription API",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint under /api for compatibility"""
    return {"status": "healthy", "service": "verbalaize-api"}


# Mount static files for frontend (after registering all API routes)
static_files_path = Path(__file__).parent.parent / "frontend/dist"

if settings.serve_frontend_dist and static_files_path.exists():
    logger.info(f"Serving frontend from: {static_files_path}")
    app.mount(
        "/",
        StaticFiles(directory=static_files_path, html=True),
        name="static",
    )
elif settings.serve_frontend_dist:
    logger.warning(f"Frontend build not found at {static_files_path}")
else:
    logger.info("Static frontend serving disabled")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        reload_dirs=["app"],
    )
