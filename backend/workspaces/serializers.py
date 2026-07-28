from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Workspace, WorkspaceMember, WorkspaceRole


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = WorkspaceMember
        fields = ("id", "user", "username", "email", "role", "joined_at")
        read_only_fields = ("id", "user", "username", "email", "joined_at")


class WorkspaceSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    members = WorkspaceMemberSerializer(many=True, read_only=True)
    current_role = serializers.SerializerMethodField()
    document_count = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = (
            "id",
            "name",
            "slug",
            "owner",
            "owner_username",
            "current_role",
            "document_count",
            "members",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "slug",
            "owner",
            "owner_username",
            "current_role",
            "document_count",
            "members",
            "created_at",
            "updated_at",
        )

    def get_current_role(self, workspace):
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return None
        if workspace.owner_id == request.user.id:
            return WorkspaceRole.OWNER
        membership = next(
            (
                member
                for member in workspace.members.all()
                if member.user_id == request.user.id
            ),
            None,
        )
        return membership.role if membership else None

    def get_document_count(self, workspace):
        annotated_count = getattr(workspace, "document_count", None)
        if annotated_count is not None:
            return annotated_count
        return workspace.documents.count()


class AddWorkspaceMemberSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    role = serializers.ChoiceField(
        choices=(WorkspaceRole.ADMIN, WorkspaceRole.MEMBER),
        default=WorkspaceRole.MEMBER,
    )

    def validate_username(self, value):
        user = get_user_model().objects.filter(username=value.strip()).first()
        if user is None:
            raise serializers.ValidationError("No user with this username exists.")
        return user
