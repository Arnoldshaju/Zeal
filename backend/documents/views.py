from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Document, DocumentMember, MemberRole
from .permissions import HasDocumentPermission
from .serializers import DocumentMemberSerializer, DocumentSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated, HasDocumentPermission]

    def get_queryset(self):
        user = self.request.user
        return (
            Document.objects.filter(Q(owner=user) | Q(members__user=user))
            .select_related("owner")
            .prefetch_related("members__user")
            .distinct()
        )

    def perform_create(self, serializer):
        document = serializer.save(owner=self.request.user)
        DocumentMember.objects.create(
            document=document,
            user=self.request.user,
            role=MemberRole.OWNER,
        )

    @action(detail=True, methods=["get", "post"], url_path="members")
    def members(self, request, pk=None):
        document = self.get_object()
        if document.owner_id != request.user.id:
            return Response(
                {"detail": "Only the document owner can manage members."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if request.method == "GET":
            memberships = document.members.select_related("user").all()
            return Response(DocumentMemberSerializer(memberships, many=True).data)

        username = str(request.data.get("username", "")).strip()
        role = request.data.get("role", MemberRole.EDITOR)
        if role not in {MemberRole.EDITOR, MemberRole.VIEWER}:
            return Response(
                {"role": "Role must be EDITOR or VIEWER."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = get_user_model().objects.filter(username=username).first()
        if user is None:
            return Response(
                {"username": "No user with this username exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if user.id == document.owner_id:
            return Response(
                {"username": "The owner is already a member."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        membership, created = DocumentMember.objects.update_or_create(
            document=document,
            user=user,
            defaults={"role": role},
        )
        return Response(
            DocumentMemberSerializer(membership).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"members/(?P<user_id>\d+)",
    )
    def member_detail(self, request, pk=None, user_id=None):
        document = self.get_object()
        if document.owner_id != request.user.id:
            return Response(
                {"detail": "Only the document owner can manage members."},
                status=status.HTTP_403_FORBIDDEN,
            )
        membership = document.members.filter(user_id=user_id).first()
        if membership is None or membership.role == MemberRole.OWNER:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if request.method == "DELETE":
            membership.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        role = request.data.get("role")
        if role not in {MemberRole.EDITOR, MemberRole.VIEWER}:
            return Response(
                {"role": "Role must be EDITOR or VIEWER."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        membership.role = role
        membership.save(update_fields=["role"])
        return Response(DocumentMemberSerializer(membership).data)
