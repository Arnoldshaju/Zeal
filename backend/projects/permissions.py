from rest_framework.permissions import SAFE_METHODS, BasePermission

from workspaces.models import WorkspaceRole

from .models import ProjectRole


def project_role(project, user):
    if project.workspace.owner_id == user.id:
        return ProjectRole.MANAGER
    if project.workspace.members.filter(
        user=user,
        role=WorkspaceRole.ADMIN,
    ).exists():
        return ProjectRole.MANAGER
    membership = project.memberships.filter(user=user).first()
    return membership.role if membership else None


class CanAccessProject(BasePermission):
    def has_object_permission(self, request, view, obj):
        project = getattr(obj, "project", obj)
        role = project_role(project, request.user)
        if request.method in SAFE_METHODS:
            return role is not None
        if role == ProjectRole.MANAGER:
            return True
        if role == ProjectRole.CONTRIBUTOR:
            if hasattr(obj, "assignee_id"):
                return obj.assignee_id == request.user.id or obj.created_by_id == request.user.id
            return view.action in {"create", "comments", "attachments"}
        return False
