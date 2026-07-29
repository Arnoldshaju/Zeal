from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Comment, Document, DocumentMember, MemberRole
from .permissions import HasDocumentPermission
from .serializers import CommentSerializer, DocumentMemberSerializer, DocumentSerializer
from workspaces.services import create_personal_workspace


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated, HasDocumentPermission]
    filterset_fields = ["workspace", "owner"]
    search_fields = ["title"]
    ordering_fields = ["created_at", "updated_at", "title"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        user = self.request.user
        queryset = (
            Document.objects.filter(
                Q(owner=user)
                | Q(members__user=user)
                | Q(workspace__owner=user)
                | Q(workspace__members__user=user)
            )
            .select_related("owner", "workspace", "workspace__owner")
            .prefetch_related("members__user", "tags")
            .distinct()
        )
        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        workspace = serializer.validated_data.get("workspace")
        if workspace is None:
            workspace = create_personal_workspace(self.request.user)
        document = serializer.save(owner=self.request.user, workspace=workspace)
        DocumentMember.objects.create(
            document=document,
            user=self.request.user,
            role=MemberRole.OWNER,
        )

    @action(detail=True, methods=["get", "post"], url_path="comments")
    def comments(self, request, pk=None):
        document = self.get_object()
        if request.method == "GET":
            comments = document.comments.select_related("author").all()
            return Response(CommentSerializer(comments, many=True).data)

        if document.owner_id != request.user.id:
            membership = document.members.filter(user=request.user).first()
            if membership is None or membership.role != MemberRole.EDITOR:
                return Response(
                    {"detail": "Only owners and editors can create comments."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = CommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        parent = serializer.validated_data.get("parent")
        if parent is not None and parent.document_id != document.id:
            return Response(
                {"parent": "A reply must belong to the same document."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        comment = serializer.save(document=document, author=request.user)
        return Response(
            CommentSerializer(comment).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"comments/(?P<comment_id>[0-9a-f-]+)",
    )
    def comment_detail(self, request, pk=None, comment_id=None):
        document = self.get_object()
        comment = document.comments.filter(id=comment_id).first()
        if comment is None:
            return Response(status=status.HTTP_404_NOT_FOUND)

        is_owner = document.owner_id == request.user.id
        is_author = comment.author_id == request.user.id
        if request.method == "DELETE":
            if not is_owner:
                return Response(
                    {"detail": "Only the document owner can delete comments."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            comment.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        requested_fields = set(request.data)
        if "is_resolved" in requested_fields and not is_owner:
            return Response(
                {"detail": "Only the document owner can resolve comments."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if "body" in requested_fields and not is_author:
            return Response(
                {"detail": "Only the comment author can edit its body."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not requested_fields.issubset({"body", "is_resolved"}):
            return Response(
                {"detail": "Only body and is_resolved can be updated."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CommentSerializer(comment, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

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
