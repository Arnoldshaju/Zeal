from rest_framework.permissions import SAFE_METHODS, BasePermission

from workspaces.models import WorkspaceRole

from .models import TeamRole


class CanAccessTeam(BasePermission):
    def has_object_permission(self, request, view, team):
        if team.workspace.owner_id == request.user.id:
            return True
        workspace_membership = team.workspace.members.filter(user=request.user).first()
        team_membership = team.memberships.filter(user=request.user).first()
        if request.method in SAFE_METHODS:
            return workspace_membership is not None or team_membership is not None
        return (
            workspace_membership is not None
            and workspace_membership.role == WorkspaceRole.ADMIN
        ) or (
            team_membership is not None
            and team_membership.role in {TeamRole.OWNER, TeamRole.MANAGER}
        )
