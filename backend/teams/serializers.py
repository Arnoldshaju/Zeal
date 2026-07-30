from django.contrib.auth import get_user_model
from rest_framework import serializers

from workspaces.models import WorkspaceRole

from .models import Team, TeamMembership, TeamRole


class TeamMembershipSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = TeamMembership
        fields = ("id", "user", "username", "role", "joined_at")
        read_only_fields = ("id", "username", "joined_at")

    def validate_user(self, user):
        team = self.context.get("team")
        if team and not (
            team.workspace.owner_id == user.id
            or team.workspace.members.filter(user=user).exists()
        ):
            raise serializers.ValidationError("User must belong to the workspace.")
        return user


class TeamSerializer(serializers.ModelSerializer):
    memberships = TeamMembershipSerializer(many=True, read_only=True)

    class Meta:
        model = Team
        fields = (
            "id",
            "workspace",
            "name",
            "description",
            "created_by",
            "memberships",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_by", "memberships", "created_at", "updated_at")

    def validate_workspace(self, workspace):
        user = self.context["request"].user
        can_manage = workspace.owner_id == user.id or workspace.members.filter(
            user=user,
            role=WorkspaceRole.ADMIN,
        ).exists()
        if not can_manage:
            raise serializers.ValidationError(
                "Only workspace owners and admins can create teams."
            )
        return workspace

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Team name cannot be empty.")
        return value


class AddTeamMemberSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    role = serializers.ChoiceField(
        choices=TeamRole.choices,
        default=TeamRole.MEMBER,
    )

    def validate_username(self, value):
        user = get_user_model().objects.filter(username=value.strip()).first()
        if user is None:
            raise serializers.ValidationError("No user with this username exists.")
        return user
