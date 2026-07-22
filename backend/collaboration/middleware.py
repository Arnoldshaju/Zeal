from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class JwtAuthMiddleware:
    """Authenticate a WebSocket from an access token in the query string."""

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        scoped = dict(scope)
        query = parse_qs(scope.get("query_string", b"").decode())
        token = query.get("token", [None])[0]
        if token:
            scoped["user"] = await self.user_from_token(token)
        elif "user" not in scoped:
            scoped["user"] = AnonymousUser()
        return await self.inner(scoped, receive, send)

    @database_sync_to_async
    def user_from_token(self, raw_token):
        authentication = JWTAuthentication()
        try:
            validated_token = authentication.get_validated_token(raw_token)
            return authentication.get_user(validated_token)
        except (InvalidToken, TokenError):
            return AnonymousUser()
