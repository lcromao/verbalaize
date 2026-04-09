"""
AppSecretMiddleware — token-based protection for local desktop mode.

How it works:
- HTTP requests must include the header:  X-App-Secret: <token>
- WebSocket connections must include the query param:  ?secret=<token>
  (browsers don't support custom headers on WebSocket upgrades)
- Uses hmac.compare_digest to prevent timing attacks.
- Health and docs endpoints are always exempt.
- When app_secret is None the middleware is a no-op (Docker / web mode).
"""

import hmac
import logging

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

logger = logging.getLogger(__name__)

EXEMPT_PATHS = {
    "/health",
    "/api/health",
    "/api",
    "/docs",
    "/redoc",
    "/openapi.json",
}


class AppSecretMiddleware:
    def __init__(self, app: ASGIApp, secret: str) -> None:
        self.app = app
        self._secret = secret.encode()

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        path: str = scope.get("path", "")

        if path in EXEMPT_PATHS:
            await self.app(scope, receive, send)
            return

        token = (
            self._ws_token(scope)
            if scope["type"] == "websocket"
            else self._http_token(scope)
        )

        if not self._valid(token):
            logger.warning("Rejected %s %s — invalid or missing secret", scope["type"], path)

            if scope["type"] == "http":
                response = JSONResponse({"detail": "Unauthorized"}, status_code=401)
                await response(scope, receive, send)
            else:
                # Consume the connect event then close without accepting
                await receive()
                await send({"type": "websocket.close", "code": 4401})
            return

        await self.app(scope, receive, send)

    # ------------------------------------------------------------------
    # Token extraction
    # ------------------------------------------------------------------

    def _http_token(self, scope: Scope) -> bytes:
        headers: list[tuple[bytes, bytes]] = scope.get("headers", [])
        for name, value in headers:
            if name.lower() == b"x-app-secret":
                return value
        return b""

    def _ws_token(self, scope: Scope) -> bytes:
        from urllib.parse import unquote
        query: str = scope.get("query_string", b"").decode()
        for part in query.split("&"):
            if part.startswith("secret="):
                # URL-decode: frontend uses encodeURIComponent, so we must decode here
                return unquote(part[7:]).encode()
        return b""

    def _valid(self, token: bytes) -> bool:
        return hmac.compare_digest(token, self._secret)
