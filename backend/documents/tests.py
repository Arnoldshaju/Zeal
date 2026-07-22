from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import DocumentMember, MemberRole


class DocumentApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("owner", "owner@example.com", "password123")
        login = self.client.post(
            "/api/auth/login/", {"username": "owner", "password": "password123"}, format="json"
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

    def test_owner_can_create_list_update_and_delete_document(self):
        created = self.client.post(
            "/api/documents/",
            {"title": "First", "content": {"type": "doc", "content": []}},
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        document_id = created.data["id"]
        self.assertTrue(
            DocumentMember.objects.filter(
                document_id=document_id, user=self.user, role=MemberRole.OWNER
            ).exists()
        )

        listed = self.client.get("/api/documents/")
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listed.data), 1)

        updated = self.client.patch(
            f"/api/documents/{document_id}/",
            {"title": "Renamed", "content": {"type": "doc", "content": [{"type": "paragraph"}]}},
            format="json",
        )
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.data["title"], "Renamed")

        deleted = self.client.delete(f"/api/documents/{document_id}/")
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)

    def test_user_cannot_see_another_users_document(self):
        created = self.client.post("/api/documents/", {"title": "Private"}, format="json")
        document_id = created.data["id"]
        stranger = get_user_model().objects.create_user("stranger", "stranger@example.com", "password123")
        self.client.force_authenticate(stranger)
        self.assertEqual(self.client.get("/api/documents/").data, [])
        self.assertEqual(
            self.client.get(f"/api/documents/{document_id}/").status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_owner_can_invite_and_change_member_role(self):
        member = get_user_model().objects.create_user(
            "member", "member@example.com", "password123"
        )
        created = self.client.post("/api/documents/", {"title": "Shared"}, format="json")
        document_id = created.data["id"]

        invited = self.client.post(
            f"/api/documents/{document_id}/members/",
            {"username": "member", "role": MemberRole.EDITOR},
            format="json",
        )
        self.assertEqual(invited.status_code, status.HTTP_201_CREATED)
        self.assertEqual(invited.data["role"], MemberRole.EDITOR)

        changed = self.client.patch(
            f"/api/documents/{document_id}/members/{member.id}/",
            {"role": MemberRole.VIEWER},
            format="json",
        )
        self.assertEqual(changed.status_code, status.HTTP_200_OK)
        self.assertEqual(changed.data["role"], MemberRole.VIEWER)
