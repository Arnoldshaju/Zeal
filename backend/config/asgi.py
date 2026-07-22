import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import OriginValidator
from django.core.asgi import get_asgi_application


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

django_asgi_application = get_asgi_application()

from collaboration.middleware import JwtAuthMiddleware
from collaboration.routing import websocket_urlpatterns


application = ProtocolTypeRouter(
    {
        "http": django_asgi_application,
        "websocket": OriginValidator(
            AuthMiddlewareStack(
                JwtAuthMiddleware(URLRouter(websocket_urlpatterns))
            ),
            ["http://localhost:3000"],
        ),
    }
)
