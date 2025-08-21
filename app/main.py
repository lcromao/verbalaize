import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

from app.core.config import settings
from app.routes import transcription
from app.schemas.transcription import ModelType
from app.services.whisper_service import get_whisper_service

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Audio transcription service using OpenAI Whisper",
    debug=settings.debug,
)

logger.info(f"Starting {settings.app_name} v{settings.app_version}")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://frontend:3000",
        "http://0.0.0.0:3000",
    ],  # Frontend dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(transcription.router, prefix="/api")


@app.on_event("startup")
async def startup_tasks():
    """Application startup tasks - preload models to avoid first-time delays"""
    try:
        logger.info("Preloading Whisper models...")
        whisper_service = get_whisper_service()

        # Preload turbo model (good balance of speed/quality) for same
        # language transcription
        await whisper_service._get_model(ModelType.TURBO)

        logger.info("Models preloaded successfully - ready for transcription")
    except Exception as e:
        logger.warning(f"Model preload warning: {str(e)}")
        logger.info("Models will be loaded on first use")


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

if static_files_path.exists():
    logger.info(f"Serving frontend from: {static_files_path}")
    app.mount(
        "/",
        StaticFiles(directory=static_files_path, html=True),
        name="static",
    )
else:
    logger.warning(f"Frontend build not found at {static_files_path}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=settings.debug)
