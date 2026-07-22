from rest_framework import permissions

from .models import DocumentMember, MemberRole


class HasDocumentPermission(permissions.BasePermission):
    def has_object_permission(self, request, view, document):
        if document.owner_id == request.user.id:
            return True

        membership = DocumentMember.objects.filter(document=document, user=request.user).first()
        if membership is None:
            return False
        if request.method in permissions.SAFE_METHODS:
            return membership.role in {MemberRole.EDITOR, MemberRole.VIEWER}
        return membership.role == MemberRole.EDITOR
