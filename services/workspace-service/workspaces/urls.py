from django.urls import path

from .views import (
    WorkspaceListCreateView,
    WorkspaceDetailView,
)


urlpatterns = [
    path(
        "",
        WorkspaceListCreateView.as_view(),
        name="workspace-list-create",
    ),
    path(
        "<uuid:pk>/",
        WorkspaceDetailView.as_view(),
        name="workspace-detail",
    ),
]
