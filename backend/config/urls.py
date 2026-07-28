from django.contrib import admin
from django.urls import include, path

from .views import health_check


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check),
    path("api/auth/", include("users.urls")),
    path("api/workspaces/", include("workspaces.urls")),
    path("api/documents/", include("documents.urls")),
]
