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


class DocumentQuerySet(models.QuerySet):
    def owned_by(self, user):
        return self.filter(owner=user)

    def recently_updated(self):
        return self.order_by("-updated_at")


class DocumentManager(models.Manager):
    def get_queryset(self):
        return DocumentQuerySet(self.model, using=self._db)

    def owned_by(self, user):
        return self.get_queryset().owned_by(user)

    def recently_updated(self):
        return self.get_queryset().recently_updated()


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
    workspace = models.ForeignKey(
        "workspaces.Workspace",
        on_delete=models.CASCADE,
        related_name="documents",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = DocumentManager()

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(
                fields=["workspace", "-updated_at"],
                name="doc_workspace_time_idx",
            ),
            models.Index(
                fields=["owner", "-updated_at"],
                name="doc_owner_time_idx",
            ),
        ]

    def __str__(self):
        return self.title


class DocumentRevision(models.Model):
    id = models.BigAutoField(primary_key=True)
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="revisions",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="document_revisions",
    )
    version = models.PositiveBigIntegerField()
    title = models.CharField(max_length=255)
    content = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-version"]
        constraints = [
            models.UniqueConstraint(
                fields=["document", "version"],
                name="unique_document_revision",
            )
        ]
        indexes = [
            models.Index(
                fields=["document", "-version"],
                name="revision_doc_version_idx",
            )
        ]

    def __str__(self):
        return f"{self.document.title} - version {self.version}"


class Comment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="document_comments",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        related_name="replies",
        null=True,
        blank=True,
    )
    body = models.TextField()
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.CheckConstraint(
                check=~models.Q(body=""),
                name="comment_body_not_empty",
            )
        ]
        indexes = [
            models.Index(
                fields=["document", "is_resolved", "-created_at"],
                name="comment_doc_state_idx",
            )
        ]

    def __str__(self):
        return f"{self.author} on {self.document}"


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
