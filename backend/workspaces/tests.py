from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from documents.models import Document
from .models import WorkspaceInvitation, WorkspaceMember, WorkspaceRole
from .services import create_personal_workspace
from .tasks import delete_expired_invitations


class WorkspaceApiTests(APITestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_user(
            "workspace-owner",
            "owner-workspace@example.com",
            "password123",
        )
        self.member = get_user_model().objects.create_user(
            "workspace-member",
            "member-workspace@example.com",
            "password123",
        )
        self.client.force_authenticate(self.owner)

    def test_listing_workspaces_creates_a_personal_workspace(self):
        response = self.client.get("/api/workspaces/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["current_role"],
            WorkspaceRole.OWNER,
        )
        self.assertEqual(
            response.data["results"][0]["slug"],
            f"personal-{self.owner.id}",
        )

    def test_owner_can_create_workspace_and_add_member(self):
        created = self.client.post(
            "/api/workspaces/",
            {"name": "Engineering"},
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        workspace_id = created.data["id"]

        added = self.client.post(
            f"/api/workspaces/{workspace_id}/members/",
            {"username": self.member.username, "role": WorkspaceRole.MEMBER},
            format="json",
        )
        self.assertEqual(added.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            WorkspaceMember.objects.filter(
                workspace_id=workspace_id,
                user=self.member,
                role=WorkspaceRole.MEMBER,
            ).exists()
        )

    def test_member_can_see_only_selected_workspace_documents(self):
        first = create_personal_workspace(self.owner)
        second_response = self.client.post(
            "/api/workspaces/",
            {"name": "Shared"},
            format="json",
        )
        second_id = second_response.data["id"]
        self.client.post(
            f"/api/workspaces/{second_id}/members/",
            {"username": self.member.username, "role": WorkspaceRole.MEMBER},
            format="json",
        )
        Document.objects.create(title="Personal", owner=self.owner, workspace=first)
        shared = Document.objects.create(
            title="Shared document",
            owner=self.owner,
            workspace_id=second_id,
        )

        self.client.force_authenticate(self.member)
        response = self.client.get(f"/api/documents/?workspace={second_id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [row["id"] for row in response.data["results"]],
            [str(shared.id)],
        )

    def test_scheduled_cleanup_removes_only_expired_invitations(self):
        workspace = create_personal_workspace(self.owner)
        expired = WorkspaceInvitation.objects.create(
            workspace=workspace,
            invited_by=self.owner,
            email="expired@example.com",
            role=WorkspaceRole.MEMBER,
            token_hash="expired-token",
            expires_at=timezone.now() - timedelta(hours=1),
        )
        active = WorkspaceInvitation.objects.create(
            workspace=workspace,
            invited_by=self.owner,
            email="active@example.com",
            role=WorkspaceRole.MEMBER,
            token_hash="active-token",
            expires_at=timezone.now() + timedelta(hours=1),
        )

        delete_expired_invitations()

        self.assertFalse(WorkspaceInvitation.objects.filter(pk=expired.pk).exists())
        self.assertTrue(WorkspaceInvitation.objects.filter(pk=active.pk).exists())
