from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from workspaces.models import WorkspaceRole

from .models import Team, TeamMembership, TeamRole
from .permissions import CanAccessTeam
from .serializers import (
    AddTeamMemberSerializer,
    TeamMembershipSerializer,
    TeamSerializer,
)


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    permission_classes = [permissions.IsAuthenticated, CanAccessTeam]
    filterset_fields = ["workspace"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at", "updated_at"]
    ordering = ["name"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset.none()
        user = self.request.user
        return (
            Team.objects.filter(
                Q(workspace__owner=user)
                | Q(workspace__members__user=user)
                | Q(memberships__user=user)
            )
            .select_related("workspace", "created_by")
            .prefetch_related("memberships__user")
            .distinct()
        )

    def perform_create(self, serializer):
        team = serializer.save(created_by=self.request.user)
        TeamMembership.objects.create(
            team=team,
            user=self.request.user,
            role=TeamRole.OWNER,
        )

    @action(detail=True, methods=["get", "post"], url_path="members")
    def members(self, request, pk=None):
        team = self.get_object()
        if request.method == "GET":
            return Response(
                TeamMembershipSerializer(team.memberships.select_related("user"), many=True).data
            )
        self._require_manager(team)
        serializer = AddTeamMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["username"]
        if not (
            team.workspace.owner_id == user.id
            or team.workspace.members.filter(user=user).exists()
        ):
            return Response(
                {"username": "User must belong to the workspace."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        membership, created = TeamMembership.objects.update_or_create(
            team=team,
            user=user,
            defaults={"role": serializer.validated_data["role"]},
        )
        return Response(
            TeamMembershipSerializer(membership).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"members/(?P<user_id>\d+)",
    )
    def member_detail(self, request, pk=None, user_id=None):
        team = self.get_object()
        self._require_manager(team)
        membership = team.memberships.filter(user_id=user_id).first()
        if membership is None or membership.role == TeamRole.OWNER:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if request.method == "DELETE":
            membership.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        role = request.data.get("role")
        if role not in {TeamRole.MANAGER, TeamRole.MEMBER}:
            return Response(
                {"role": "Role must be MANAGER or MEMBER."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        membership.role = role
        membership.save(update_fields=["role"])
        return Response(TeamMembershipSerializer(membership).data)

    def _require_manager(self, team):
        if team.workspace.owner_id == self.request.user.id:
            return
        workspace_admin = team.workspace.members.filter(
            user=self.request.user,
            role=WorkspaceRole.ADMIN,
        ).exists()
        team_manager = team.memberships.filter(
            user=self.request.user,
            role__in=[TeamRole.OWNER, TeamRole.MANAGER],
        ).exists()
        if not (workspace_admin or team_manager):
            raise PermissionDenied("Only team managers can manage members.")
