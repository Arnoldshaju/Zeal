from rest_framework import serializers

from .models import (
    Comment,
    Document,
    DocumentAttachment,
    DocumentMember,
    DocumentRevision,
    Tag,
)
from workspaces.models import Workspace


class DocumentMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = DocumentMember
        fields = ("id", "user", "username", "email", "role", "created_at")
        read_only_fields = ("id", "created_at")


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ("id", "name", "color", "created_at")
        read_only_fields = ("id", "created_at")


class DocumentRevisionSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)

    class Meta:
        model = DocumentRevision
        fields = (
            "id",
            "document",
            "author",
            "author_username",
            "version",
            "title",
            "content",
            "created_at",
        )
        read_only_fields = fields


class DocumentAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_username = serializers.CharField(
        source="uploaded_by.username",
        read_only=True,
    )

    class Meta:
        model = DocumentAttachment
        fields = (
            "id",
            "file",
            "original_name",
            "size",
            "uploaded_by",
            "uploaded_by_username",
            "uploaded_at",
        )
        read_only_fields = fields


class CommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)

    class Meta:
        model = Comment
        fields = (
            "id",
            "document",
            "author",
            "author_username",
            "parent",
            "body",
            "is_resolved",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "document", "author", "created_at", "updated_at")

    def validate_body(self, value):
        if not value.strip():
            raise serializers.ValidationError("Comment body cannot be empty.")
        return value


class DocumentSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    members = DocumentMemberSerializer(many=True, read_only=True)

    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        source="tags",
        queryset=Tag.objects.all(),
        many=True,
        required=False,
        write_only=True,
    )
    workspace = serializers.PrimaryKeyRelatedField(
        queryset=Workspace.objects.all(),
        required=False,
        allow_null=True,
    )

    def validate_workspace(self, workspace):
        if workspace is None:
            return workspace
        user = self.context["request"].user
        if workspace.owner_id == user.id or workspace.members.filter(user=user).exists():
            return workspace
        raise serializers.ValidationError("You do not belong to this workspace.")

    class Meta:
        model = Document
        fields = (
            "id",
            "title",
            "content",
            "owner",
            "owner_username",
            "members",
            "tags",
            "tag_ids",
            "workspace",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "owner", "created_at", "updated_at")
