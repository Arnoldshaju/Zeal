from django.core.cache import cache
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import (
    ActivityLog,
    Notification,
    Project,
    ProjectMembership,
    ProjectRole,
    Task,
    TaskAttachment,
    TaskStatus,
)
from .permissions import CanAccessProject, project_role
from .serializers import (
    ActivityLogSerializer,
    NotificationSerializer,
    ProjectMembershipSerializer,
    ProjectSerializer,
    TaskAttachmentSerializer,
    TaskAttachmentUploadSerializer,
    TaskCommentSerializer,
    TaskSerializer,
)
from .services import invalidate_project_cache, notify, record_activity


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated, CanAccessProject]
    filterset_fields = ["workspace", "team", "status"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at", "updated_at", "due_date"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset.none()
        user = self.request.user
        return (
            Project.objects.filter(
                Q(workspace__owner=user)
                | Q(workspace__members__user=user, memberships__user=user)
                | Q(memberships__user=user)
            )
            .select_related("workspace", "team", "created_by")
            .prefetch_related("memberships__user")
            .distinct()
        )

    def perform_create(self, serializer):
        project = serializer.save(created_by=self.request.user)
        ProjectMembership.objects.create(
            project=project,
            user=self.request.user,
            role=ProjectRole.MANAGER,
        )
        record_activity(
            project=project,
            actor=self.request.user,
            action="project.created",
        )

    def perform_update(self, serializer):
        project = self.get_object()
        before = {"name": project.name, "status": project.status}
        updated = serializer.save()
        record_activity(
            project=updated,
            actor=self.request.user,
            action="project.updated",
            changes={"before": before, "after": {"name": updated.name, "status": updated.status}},
        )
        invalidate_project_cache(updated.id)

    @action(detail=True, methods=["get", "post"], url_path="members")
    def members(self, request, pk=None):
        project = self.get_object()
        if request.method == "GET":
            return Response(
                ProjectMembershipSerializer(
                    project.memberships.select_related("user"),
                    many=True,
                ).data
            )
        self._require_manager(project)
        serializer = ProjectMembershipSerializer(
            data=request.data,
            context={"project": project},
        )
        serializer.is_valid(raise_exception=True)
        membership, created = ProjectMembership.objects.update_or_create(
            project=project,
            user=serializer.validated_data["user"],
            defaults={"role": serializer.validated_data["role"]},
        )
        return Response(
            ProjectMembershipSerializer(membership).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="activity")
    def activity(self, request, pk=None):
        project = self.get_object()
        return Response(
            ActivityLogSerializer(
                project.activity_logs.select_related("actor", "task"),
                many=True,
            ).data
        )

    @action(detail=True, methods=["get"], url_path="stats")
    def stats(self, request, pk=None):
        project = self.get_object()
        cache_key = f"project:{project.id}:stats"
        data = cache.get(cache_key)
        if data is None:
            counts = {
                row["status"]: row["count"]
                for row in project.tasks.values("status").annotate(count=Count("id"))
            }
            data = {
                "total": sum(counts.values()),
                "by_status": {
                    choice: counts.get(choice, 0)
                    for choice, _label in TaskStatus.choices
                },
            }
            cache.set(cache_key, data, timeout=60)
        return Response(data)

    def _require_manager(self, project):
        if project_role(project, self.request.user) != ProjectRole.MANAGER:
            raise PermissionDenied("Only project managers can manage members.")


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated, CanAccessProject]
    filterset_fields = ["project", "status", "priority", "assignee"]
    search_fields = ["title", "description"]
    ordering_fields = ["title", "due_date", "created_at", "updated_at", "priority"]
    ordering = ["due_date", "-updated_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset.none()
        user = self.request.user
        return (
            Task.objects.filter(
                Q(project__workspace__owner=user)
                | Q(project__memberships__user=user)
            )
            .select_related("project", "project__workspace", "created_by", "assignee")
            .distinct()
        )

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        role = project_role(project, self.request.user)
        if role not in {ProjectRole.MANAGER, ProjectRole.CONTRIBUTOR}:
            raise PermissionDenied("You cannot create tasks in this project.")
        task = serializer.save(created_by=self.request.user)
        record_activity(
            project=project,
            task=task,
            actor=self.request.user,
            action="task.created",
        )
        notify(
            recipient=task.assignee,
            actor=self.request.user,
            task=task,
            kind="task.assigned",
            message=f"You were assigned to {task.title}.",
        )
        invalidate_project_cache(project.id)

    def perform_update(self, serializer):
        task = self.get_object()
        before = {
            "status": task.status,
            "priority": task.priority,
            "assignee_id": task.assignee_id,
        }
        updated = serializer.save()
        after = {
            "status": updated.status,
            "priority": updated.priority,
            "assignee_id": updated.assignee_id,
        }
        record_activity(
            project=updated.project,
            task=updated,
            actor=self.request.user,
            action="task.updated",
            changes={"before": before, "after": after},
        )
        if before["assignee_id"] != after["assignee_id"]:
            notify(
                recipient=updated.assignee,
                actor=self.request.user,
                task=updated,
                kind="task.assigned",
                message=f"You were assigned to {updated.title}.",
            )
        invalidate_project_cache(updated.project_id)

    def perform_destroy(self, instance):
        project_id = instance.project_id
        instance.delete()
        invalidate_project_cache(project_id)

    @action(detail=True, methods=["get", "post"], url_path="comments")
    def comments(self, request, pk=None):
        task = self.get_object()
        if request.method == "GET":
            return Response(
                TaskCommentSerializer(
                    task.comments.select_related("author"),
                    many=True,
                ).data
            )
        if project_role(task.project, request.user) == ProjectRole.VIEWER:
            raise PermissionDenied("Viewers cannot comment.")
        serializer = TaskCommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(task=task, author=request.user)
        record_activity(
            project=task.project,
            task=task,
            actor=request.user,
            action="task.commented",
        )
        notify(
            recipient=task.assignee,
            actor=request.user,
            task=task,
            kind="task.commented",
            message=f"{request.user.username} commented on {task.title}.",
        )
        return Response(
            TaskCommentSerializer(comment).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get", "post"], url_path="attachments")
    def attachments(self, request, pk=None):
        task = self.get_object()
        if request.method == "GET":
            return Response(
                TaskAttachmentSerializer(
                    task.attachments.all(),
                    many=True,
                    context={"request": request},
                ).data
            )
        if project_role(task.project, request.user) == ProjectRole.VIEWER:
            raise PermissionDenied("Viewers cannot upload attachments.")
        serializer = TaskAttachmentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uploaded_file = serializer.validated_data["file"]
        attachment = TaskAttachment.objects.create(
            task=task,
            uploaded_by=request.user,
            file=uploaded_file,
            original_name=uploaded_file.name,
            size=uploaded_file.size,
        )
        record_activity(
            project=task.project,
            task=task,
            actor=request.user,
            action="attachment.uploaded",
            changes={"name": uploaded_file.name, "size": uploaded_file.size},
        )
        return Response(
            TaskAttachmentSerializer(
                attachment,
                context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset.none()
        return Notification.objects.filter(recipient=self.request.user).select_related(
            "actor",
            "task",
        )

    @action(detail=True, methods=["post"], url_path="read")
    def read(self, request, pk=None):
        notification = self.get_object()
        if notification.read_at is None:
            notification.read_at = timezone.now()
            notification.save(update_fields=["read_at"])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=["post"], url_path="read-all")
    def read_all(self, request):
        updated = self.get_queryset().filter(read_at__isnull=True).update(
            read_at=timezone.now()
        )
        return Response({"updated": updated})
