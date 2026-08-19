from rest_framework import serializers

from .models import Workspace, WorkspaceMember


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = [
            "id",
            "name",
            "slug",
            "owner_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "owner_id",
            "created_at",
            "updated_at",
        ]


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkspaceMember
        fields = [
            "id",
            "workspace",
            "user_id",
            "role",
            "joined_at",
        ]
        read_only_fields = [
            "id",
            "joined_at",
        ]
