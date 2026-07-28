from django.db import transaction
from django.db.models import Count, Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import AuditLog, Workspace, WorkspaceMember, WorkspaceRole
from .serializers import (
    AddWorkspaceMemberSerializer,
    WorkspaceMemberSerializer,
    WorkspaceSerializer,
)
from .services import create_personal_workspace, create_workspace


class WorkspaceViewSet(viewsets.ModelViewSet):
    serializer_class = WorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        create_personal_workspace(self.request.user)
        return (
            Workspace.objects.filter(
                Q(owner=self.request.user) | Q(members__user=self.request.user)
            )
            .select_related("owner")
            .prefetch_related("members__user")
            .annotate(document_count=Count("documents", distinct=True))
            .distinct()
        )

    def perform_create(self, serializer):
        workspace = create_workspace(
            owner=self.request.user,
            name=serializer.validated_data["name"].strip(),
        )
        serializer.instance = workspace

    def perform_update(self, serializer):
        workspace = self.get_object()
        self._require_owner_or_admin(workspace)
        old_name = workspace.name
        updated = serializer.save(name=serializer.validated_data["name"].strip())
        AuditLog.objects.create(
            workspace=updated,
            actor=self.request.user,
            action="WORKSPACE_RENAMED",
            entity_type="Workspace",
            entity_id=str(updated.id),
            metadata={"old_name": old_name, "new_name": updated.name},
        )

    def destroy(self, request, *args, **kwargs):
        workspace = self.get_object()
        if workspace.owner_id != request.user.id:
            raise PermissionDenied("Only the workspace owner can delete it.")
        if workspace.slug == f"personal-{request.user.id}":
            return Response(
                {"detail": "Your personal workspace cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["get", "post"], url_path="members")
    def members(self, request, pk=None):
        workspace = self.get_object()
        if request.method == "GET":
            return Response(
                WorkspaceMemberSerializer(
                    workspace.members.select_related("user"),
                    many=True,
                ).data
            )

        self._require_owner_or_admin(workspace)
        serializer = AddWorkspaceMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["username"]
        role = serializer.validated_data["role"]
        if user.id == workspace.owner_id:
            return Response(
                {"username": "The workspace owner is already a member."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if self._role_for(workspace) == WorkspaceRole.ADMIN and role == WorkspaceRole.ADMIN:
            raise PermissionDenied("Only the workspace owner can appoint admins.")

        with transaction.atomic():
            membership, created = WorkspaceMember.objects.update_or_create(
                workspace=workspace,
                user=user,
                defaults={"role": role},
            )
            AuditLog.objects.create(
                workspace=workspace,
                actor=request.user,
                action="WORKSPACE_MEMBER_ADDED" if created else "MEMBER_ROLE_CHANGED",
                entity_type="WorkspaceMember",
                entity_id=str(membership.id),
                metadata={"username": user.username, "role": role},
            )
        return Response(
            WorkspaceMemberSerializer(membership).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"members/(?P<user_id>\d+)",
    )
    def member_detail(self, request, pk=None, user_id=None):
        workspace = self.get_object()
        actor_role = self._require_owner_or_admin(workspace)
        membership = workspace.members.filter(user_id=user_id).select_related("user").first()
        if membership is None or membership.role == WorkspaceRole.OWNER:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if actor_role == WorkspaceRole.ADMIN and membership.role == WorkspaceRole.ADMIN:
            raise PermissionDenied("Admins cannot manage other admins.")

        if request.method == "DELETE":
            with transaction.atomic():
                AuditLog.objects.create(
                    workspace=workspace,
                    actor=request.user,
                    action="WORKSPACE_MEMBER_REMOVED",
                    entity_type="WorkspaceMember",
                    entity_id=str(membership.id),
                    metadata={"username": membership.user.username, "role": membership.role},
                )
                membership.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        role = request.data.get("role")
        if role not in {WorkspaceRole.ADMIN, WorkspaceRole.MEMBER}:
            return Response(
                {"role": "Role must be ADMIN or MEMBER."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if actor_role == WorkspaceRole.ADMIN and role == WorkspaceRole.ADMIN:
            raise PermissionDenied("Only the workspace owner can appoint admins.")

        old_role = membership.role
        with transaction.atomic():
            membership.role = role
            membership.save(update_fields=["role"])
            AuditLog.objects.create(
                workspace=workspace,
                actor=request.user,
                action="MEMBER_ROLE_CHANGED",
                entity_type="WorkspaceMember",
                entity_id=str(membership.id),
                metadata={
                    "username": membership.user.username,
                    "old_role": old_role,
                    "new_role": role,
                },
            )
        return Response(WorkspaceMemberSerializer(membership).data)

    def _role_for(self, workspace):
        if workspace.owner_id == self.request.user.id:
            return WorkspaceRole.OWNER
        membership = workspace.members.filter(user=self.request.user).first()
        return membership.role if membership else None

    def _require_owner_or_admin(self, workspace):
        role = self._role_for(workspace)
        if role not in {WorkspaceRole.OWNER, WorkspaceRole.ADMIN}:
            raise PermissionDenied("Only workspace owners and admins can do that.")
        return role

