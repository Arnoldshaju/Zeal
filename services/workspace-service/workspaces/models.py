import uuid

from django.db import models


class WorkspaceRole(models.TextChoices):
    OWNER = "OWNER", "Owner"
    ADMIN = "ADMIN", "Admin"
    MEMBER = "MEMBER", "Member"


class Workspace(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    name = models.CharField(max_length=120)

    slug = models.SlugField(
        max_length=140,
        unique=True,
    )

    owner_id = models.IntegerField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class WorkspaceMember(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="members",
    )

    user_id = models.IntegerField()

    role = models.CharField(
        max_length=10,
        choices=WorkspaceRole.choices,
        default=WorkspaceRole.MEMBER,
    )

    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "user_id"],
                name="unique_workspace_member",
            ),
        ]

    def __str__(self):
        return f"{self.workspace.name} - {self.user_id}"
