from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from .views import health_check, status_page


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check),
    path("status/", status_page),
    path("api/auth/", include("users.urls")),
    path("api/workspaces/", include("workspaces.urls")),
    path("api/documents/", include("documents.urls")),
    path("api/v1/auth/", include("users.urls")),
    path("api/v1/workspaces/", include("workspaces.urls")),
    path("api/v1/documents/", include("documents.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
