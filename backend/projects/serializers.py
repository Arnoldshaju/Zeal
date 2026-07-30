from pathlib import Path

from rest_framework import serializers

from workspaces.models import WorkspaceRole

from .models import (
    ActivityLog,
    Notification,
    Project,
    ProjectMembership,
    ProjectRole,
    Task,
    TaskAttachment,
    TaskComment,
)


ALLOWED_TASK_ATTACHMENT_EXTENSIONS = {".txt", ".pdf", ".png", ".jpg"}
MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024


class ProjectMembershipSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = ProjectMembership
        fields = ("id", "user", "username", "role", "joined_at")
        read_only_fields = ("id", "username", "joined_at")

    def validate_user(self, user):
        project = self.context.get("project")
        if project and not (
            project.workspace.owner_id == user.id
            or project.workspace.members.filter(user=user).exists()
        ):
            raise serializers.ValidationError("User must belong to the workspace.")
        return user


class ProjectSerializer(serializers.ModelSerializer):
    memberships = ProjectMembershipSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = (
            "id",
            "workspace",
            "team",
            "name",
            "description",
            "status",
            "created_by",
            "start_date",
            "due_date",
            "memberships",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_by", "memberships", "created_at", "updated_at")

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        workspace = attrs.get("workspace", getattr(instance, "workspace", None))
        team = attrs.get("team", getattr(instance, "team", None))
        start_date = attrs.get("start_date", getattr(instance, "start_date", None))
        due_date = attrs.get("due_date", getattr(instance, "due_date", None))
        if team and team.workspace_id != workspace.id:
            raise serializers.ValidationError(
                {"team": "Team must belong to the project workspace."}
            )
        if start_date and due_date and due_date < start_date:
            raise serializers.ValidationError(
                {"due_date": "Due date cannot be before start date."}
            )
        if instance is None:
            user = self.context["request"].user
            can_manage = workspace.owner_id == user.id or workspace.members.filter(
                user=user,
                role=WorkspaceRole.ADMIN,
            ).exists()
            if not can_manage:
                raise serializers.ValidationError(
                    {"workspace": "Only workspace owners and admins can create projects."}
                )
        return attrs

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Project name cannot be empty.")
        return value


class TaskSerializer(serializers.ModelSerializer):
    assignee_username = serializers.CharField(
        source="assignee.username",
        read_only=True,
    )

    class Meta:
        model = Task
        fields = (
            "id",
            "project",
            "title",
            "description",
            "status",
            "priority",
            "created_by",
            "assignee",
            "assignee_username",
            "start_date",
            "due_date",
            "completed_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "created_by",
            "assignee_username",
            "completed_at",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        project = attrs.get("project", getattr(instance, "project", None))
        assignee = attrs.get("assignee", getattr(instance, "assignee", None))
        start_date = attrs.get("start_date", getattr(instance, "start_date", None))
        due_date = attrs.get("due_date", getattr(instance, "due_date", None))
        if start_date and due_date and due_date < start_date:
            raise serializers.ValidationError(
                {"due_date": "Due date cannot be before start date."}
            )
        if assignee and not (
            project.created_by_id == assignee.id
            or project.workspace.owner_id == assignee.id
            or project.memberships.filter(user=assignee).exists()
        ):
            raise serializers.ValidationError(
                {"assignee": "Assignee must be a project member."}
            )
        return attrs

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Task title cannot be empty.")
        return value


class TaskCommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)

    class Meta:
        model = TaskComment
        fields = ("id", "author", "author_username", "body", "created_at", "updated_at")
        read_only_fields = ("id", "author", "author_username", "created_at", "updated_at")

    def validate_body(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Comment cannot be empty.")
        return value


class TaskAttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = TaskAttachment
        fields = ("id", "original_name", "size", "url", "uploaded_at")

    def get_url(self, attachment):
        request = self.context.get("request")
        if not attachment.file:
            return None
        return request.build_absolute_uri(attachment.file.url) if request else attachment.file.url


class TaskAttachmentUploadSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, uploaded_file):
        if uploaded_file.size > MAX_ATTACHMENT_SIZE:
            raise serializers.ValidationError("Files cannot be larger than 10 MB.")
        extension = Path(uploaded_file.name).suffix.lower()
        if extension not in ALLOWED_TASK_ATTACHMENT_EXTENSIONS:
            raise serializers.ValidationError(
                "Unsupported file type. Allowed extensions are .txt, .pdf, .png, and .jpg."
            )
        return uploaded_file


class ActivityLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True)

    class Meta:
        model = ActivityLog
        fields = (
            "id",
            "actor",
            "actor_username",
            "project",
            "task",
            "action",
            "changes",
            "created_at",
        )


class NotificationSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True)

    class Meta:
        model = Notification
        fields = (
            "id",
            "actor",
            "actor_username",
            "task",
            "kind",
            "message",
            "target_url",
            "read_at",
            "created_at",
        )
