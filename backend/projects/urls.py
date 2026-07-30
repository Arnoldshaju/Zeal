from rest_framework.routers import DefaultRouter

from .views import NotificationViewSet, ProjectViewSet, TaskViewSet


router = DefaultRouter()
router.register("projects", ProjectViewSet, basename="project")
router.register("tasks", TaskViewSet, basename="task")
router.register("notifications", NotificationViewSet, basename="notification")

urlpatterns = router.urls
