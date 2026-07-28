import uuid

from django.conf import settings
from django.db import models


class MemberRole(models.TextChoices):
    OWNER = "OWNER", "Owner"
    EDITOR = "EDITOR", "Editor"
    VIEWER = "VIEWER", "Viewer"
class Tag(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=7, default="#64748b")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, default="Untitled")
    content = models.JSONField(default=dict, blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_documents",
    )
    tags = models.ManyToManyField(
        Tag,
        related_name="documents",
        blank=True,
      )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title


class DocumentMember(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="document_memberships",
    )
    role = models.CharField(max_length=10, choices=MemberRole.choices, default=MemberRole.VIEWER)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["document", "user"], name="unique_document_member")
        ]

    def __str__(self):
        return f"{self.user} - {self.document} - {self.role}"
