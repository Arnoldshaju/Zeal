import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class ProjectStatus(models.TextChoices):
    PLANNING = "PLANNING", "Planning"
    ACTIVE = "ACTIVE", "Active"
    COMPLETED = "COMPLETED", "Completed"
    ARCHIVED = "ARCHIVED", "Archived"


class ProjectRole(models.TextChoices):
    MANAGER = "MANAGER", "Manager"
    CONTRIBUTOR = "CONTRIBUTOR", "Contributor"
    VIEWER = "VIEWER", "Viewer"


class TaskStatus(models.TextChoices):
    TODO = "TODO", "To do"
    IN_PROGRESS = "IN_PROGRESS", "In progress"
    REVIEW = "REVIEW", "Review"
    DONE = "DONE", "Done"


class TaskPriority(models.TextChoices):
    LOW = "LOW", "Low"
    MEDIUM = "MEDIUM", "Medium"
    HIGH = "HIGH", "High"
    URGENT = "URGENT", "Urgent"


class Project(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "workspaces.Workspace",
        on_delete=models.CASCADE,
        related_name="projects",
    )
    team = models.ForeignKey(
        "teams.Team",
        on_delete=models.SET_NULL,
        related_name="projects",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=12,
        choices=ProjectStatus.choices,
        default=ProjectStatus.PLANNING,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_projects",
    )
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "name"],
                name="unique_project_name_per_workspace",
            )
        ]
        indexes = [
            models.Index(
                fields=["workspace", "status", "-updated_at"],
                name="project_workspace_state_idx",
            )
        ]

    def clean(self):
        if self.team_id and self.team.workspace_id != self.workspace_id:
            raise ValidationError({"team": "Team must belong to the project workspace."})
        if self.start_date and self.due_date and self.due_date < self.start_date:
            raise ValidationError({"due_date": "Due date cannot be before start date."})

    def __str__(self):
        return self.name


class ProjectMembership(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="project_memberships",
    )
    role = models.CharField(
        max_length=12,
        choices=ProjectRole.choices,
        default=ProjectRole.CONTRIBUTOR,
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["project", "user"],
                name="unique_project_member",
            )
        ]


class Task(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="tasks",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=12,
        choices=TaskStatus.choices,
        default=TaskStatus.TODO,
    )
    priority = models.CharField(
        max_length=10,
        choices=TaskPriority.choices,
        default=TaskPriority.MEDIUM,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_tasks",
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="assigned_tasks",
        null=True,
        blank=True,
    )
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    reminder_sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["due_date", "-updated_at"]
        indexes = [
            models.Index(
                fields=["project", "status", "due_date"],
                name="task_project_state_due_idx",
            ),
            models.Index(
                fields=["assignee", "status", "due_date"],
                name="task_assignee_state_idx",
            ),
        ]

    def clean(self):
        if not self.title.strip():
            raise ValidationError({"title": "Task title cannot be empty."})
        if self.start_date and self.due_date and self.due_date < self.start_date:
            raise ValidationError({"due_date": "Due date cannot be before start date."})
        if self.assignee_id:
            is_member = (
                self.project.created_by_id == self.assignee_id
                or self.project.memberships.filter(user_id=self.assignee_id).exists()
            )
            if not is_member:
                raise ValidationError({"assignee": "Assignee must be a project member."})

    def save(self, *args, **kwargs):
        if self.status == TaskStatus.DONE and self.completed_at is None:
            self.completed_at = timezone.now()
        elif self.status != TaskStatus.DONE:
            self.completed_at = None
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class TaskComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="task_comments",
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.CheckConstraint(
                check=~models.Q(body=""),
                name="task_comment_body_not_empty",
            )
        ]


def task_attachment_path(instance, filename):
    return f"tasks/{instance.task_id}/{uuid.uuid4()}-{filename}"


class TaskAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="attachments")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="task_attachments",
    )
    file = models.FileField(upload_to=task_attachment_path)
    original_name = models.CharField(max_length=255)
    size = models.PositiveBigIntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]


class ActivityLog(models.Model):
    id = models.BigAutoField(primary_key=True)
    workspace = models.ForeignKey(
        "workspaces.Workspace",
        on_delete=models.CASCADE,
        related_name="project_activity_logs",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="project_activity_logs",
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="activity_logs",
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="activity_logs",
        null=True,
        blank=True,
    )
    action = models.CharField(max_length=60)
    changes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["project", "-created_at"],
                name="project_activity_time_idx",
            )
        ]


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications_created",
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="notifications",
        null=True,
        blank=True,
    )
    kind = models.CharField(max_length=50)
    message = models.CharField(max_length=255)
    target_url = models.CharField(max_length=500, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["recipient", "read_at", "-created_at"],
                name="notification_recipient_idx",
            )
        ]

# Create your models here.
