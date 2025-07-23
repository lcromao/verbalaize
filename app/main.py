import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routes import transcription
from app.schemas.transcription import ModelType
from app.services.whisper_service import whisper_service

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
app.include_router(transcription.router)


@app.on_event("startup")
async def warm_models():
    """Preload commonly used models to improve first request performance"""
    try:
        logger.info("Preloading Whisper models...")
        # Preload the medium model (most commonly used)
        await whisper_service._get_model(ModelType.MEDIUM)
        logger.info("Model preloading completed successfully")
    except Exception as e:
        logger.warning(f"Model preloading failed (will load on demand): {str(e)}")


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "message": "Welcome to Verbalaize Audio Transcription API",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "verbalaize-api"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=settings.debug)
