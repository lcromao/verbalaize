from app.core.config import settings
from app.main import app

import uvicorn


def main() -> None:
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        reload=False,
        log_level="debug" if settings.debug else "info",
        timeout_graceful_shutdown=5,
    )


if __name__ == "__main__":
    main()
