from rest_framework import permissions

from .models import DocumentMember, MemberRole
from workspaces.models import WorkspaceRole


class HasDocumentPermission(permissions.BasePermission):
    def has_object_permission(self, request, view, document):
        if document.owner_id == request.user.id:
            return True

        if document.workspace_id is not None:
            if document.workspace.owner_id == request.user.id:
                return True
            workspace_membership = document.workspace.members.filter(
                user=request.user
            ).first()
            if workspace_membership is not None:
                if request.method in permissions.SAFE_METHODS:
                    return True
                if workspace_membership.role in {
                    WorkspaceRole.OWNER,
                    WorkspaceRole.ADMIN,
                }:
                    return True

        membership = DocumentMember.objects.filter(document=document, user=request.user).first()
        if membership is None:
            return False
        if request.method in permissions.SAFE_METHODS:
            return membership.role in {MemberRole.EDITOR, MemberRole.VIEWER}
        return membership.role == MemberRole.EDITOR
