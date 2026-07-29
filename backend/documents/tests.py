from datetime import timedelta
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import close_old_connections
from django.test import TestCase
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from users.factories import UserFactory

from .factories import DocumentFactory
from .models import Document, DocumentMember, DocumentRevision, MemberRole, Tag
from .services import update_document_with_revision


class DocumentManagerTests(TestCase):
    def setUp(self):
        self.owner = UserFactory(
            username="manager-owner",
            email="manager-owner@example.com",
        )
        self.other_user = UserFactory(
            username="manager-other",
            email="manager-other@example.com",
        )

    def test_owned_by_returns_only_documents_belonging_to_user(self):
        owned_document = DocumentFactory(
            title="Owned",
            owner=self.owner,
        )
        DocumentFactory(
            title="Someone else's",
            owner=self.other_user,
        )

        documents = Document.objects.owned_by(self.owner)

        self.assertQuerySetEqual(documents, [owned_document])

    def test_recently_updated_orders_newest_document_first(self):
        older_document = Document.objects.create(
            title="Older",
            owner=self.owner,
        )
        newer_document = Document.objects.create(
            title="Newer",
            owner=self.owner,
        )
        now = timezone.now()
        Document.objects.filter(pk=older_document.pk).update(
            updated_at=now - timedelta(days=1)
        )
        Document.objects.filter(pk=newer_document.pk).update(updated_at=now)

        documents = list(Document.objects.recently_updated())

        self.assertEqual(documents, [newer_document, older_document])

    def test_containing_title_matches_case_insensitively(self):
        matching_document = DocumentFactory(
            title="PostgreSQL Project",
            owner=self.owner,
        )
        DocumentFactory(title="Meeting notes", owner=self.owner)

        documents = Document.objects.containing_title("project")

        self.assertQuerySetEqual(documents, [matching_document])


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
        self.assertEqual(listed.data["count"], 1)
        self.assertEqual(len(listed.data["results"]), 1)

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
        self.assertEqual(self.client.get("/api/documents/").data["results"], [])
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

    def test_user_can_create_document_with_tags(self):
        database_tag = Tag.objects.create(name="database", color="#336791")
        backend_tag = Tag.objects.create(name="backend", color="#0c4b33")

        response = self.client.post(
            "/api/documents/",
            {
                "title": "PostgreSQL Notes",
                "content": {"type": "doc", "content": []},
                "tag_ids": [database_tag.id, backend_tag.id],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["tags"]), 2)

    def test_document_attachment_can_be_uploaded_and_listed(self):
        document = Document.objects.create(title="With file", owner=self.user)
        DocumentMember.objects.create(
            document=document,
            user=self.user,
            role=MemberRole.OWNER,
        )

        uploaded = self.client.post(
            f"/api/documents/{document.id}/attachments/",
            {"file": SimpleUploadedFile("notes.txt", b"Zeal attachment")},
            format="multipart",
        )
        listed = self.client.get(
            f"/api/documents/{document.id}/attachments/"
        )

        self.assertEqual(uploaded.status_code, status.HTTP_201_CREATED)
        self.assertEqual(uploaded.data["original_name"], "notes.txt")
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listed.data), 1)

    def test_document_attachment_rejects_unsupported_extension(self):
        document = Document.objects.create(title="With file", owner=self.user)
        DocumentMember.objects.create(
            document=document,
            user=self.user,
            role=MemberRole.OWNER,
        )

        response = self.client.post(
            f"/api/documents/{document.id}/attachments/",
            {"file": SimpleUploadedFile("malware.exe", b"not executable")},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Unsupported file type", response.data["file"])
        self.assertEqual(document.attachments.count(), 0)

    def test_document_attachment_rejects_file_larger_than_ten_mb(self):
        document = Document.objects.create(title="With file", owner=self.user)
        DocumentMember.objects.create(
            document=document,
            user=self.user,
            role=MemberRole.OWNER,
        )
        oversized_file = SimpleUploadedFile(
            "large.txt",
            b"x" * (10 * 1024 * 1024 + 1),
        )

        response = self.client.post(
            f"/api/documents/{document.id}/attachments/",
            {"file": oversized_file},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["file"], "Files cannot be larger than 10 MB.")
        self.assertEqual(document.attachments.count(), 0)

    def test_document_creation_is_idempotent(self):
        payload = {"title": "Created once"}
        headers = {"HTTP_IDEMPOTENCY_KEY": "document-create-1"}

        first = self.client.post(
            "/api/documents/",
            payload,
            format="json",
            **headers,
        )
        replay = self.client.post(
            "/api/documents/",
            payload,
            format="json",
            **headers,
        )

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(replay.status_code, status.HTTP_201_CREATED)
        self.assertEqual(replay["Idempotency-Replayed"], "true")
        self.assertEqual(Document.objects.filter(title="Created once").count(), 1)

    def test_idempotency_key_cannot_be_reused_with_different_data(self):
        headers = {"HTTP_IDEMPOTENCY_KEY": "document-create-conflict"}

        first = self.client.post(
            "/api/documents/",
            {"title": "First request"},
            format="json",
            **headers,
        )
        conflict = self.client.post(
            "/api/documents/",
            {"title": "Different request"},
            format="json",
            **headers,
        )

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(conflict.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(Document.objects.filter(title="First request").count(), 1)
        self.assertFalse(Document.objects.filter(title="Different request").exists())

    def test_editor_can_create_comment_and_owner_can_resolve_it(self):
        editor = get_user_model().objects.create_user(
            "editor", "editor@example.com", "password123"
        )
        created = self.client.post(
            "/api/documents/",
            {"title": "Reviewable"},
            format="json",
        )
        document_id = created.data["id"]
        DocumentMember.objects.create(
            document_id=document_id,
            user=editor,
            role=MemberRole.EDITOR,
        )

        self.client.force_authenticate(editor)
        comment = self.client.post(
            f"/api/documents/{document_id}/comments/",
            {"body": "Please clarify this section."},
            format="json",
        )
        self.assertEqual(comment.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(self.user)
        resolved = self.client.patch(
            f"/api/documents/{document_id}/comments/{comment.data['id']}/",
            {"is_resolved": True},
            format="json",
        )
        self.assertEqual(resolved.status_code, status.HTTP_200_OK)
        self.assertTrue(resolved.data["is_resolved"])

    def test_document_list_supports_search_ordering_and_pagination(self):
        Document.objects.create(title="Alpha plan", owner=self.user)
        Document.objects.create(title="Beta plan", owner=self.user)

        response = self.client.get(
            "/api/documents/?search=plan&ordering=title"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(
            [document["title"] for document in response.data["results"]],
            ["Alpha plan", "Beta plan"],
        )

    def test_document_list_is_paginated(self):
        Document.objects.bulk_create(
            [
                Document(title=f"Document {number:02}", owner=self.user)
                for number in range(21)
            ]
        )

        response = self.client.get("/api/documents/?ordering=title")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 21)
        self.assertEqual(len(response.data["results"]), 20)
        self.assertIsNotNone(response.data["next"])

    def test_invalid_workspace_filter_is_rejected(self):
        response = self.client.get("/api/documents/?workspace=not-a-uuid")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_viewer_cannot_update_document(self):
        viewer = get_user_model().objects.create_user(
            "viewer",
            "viewer@example.com",
            "password123",
        )
        document = Document.objects.create(title="Read only", owner=self.user)
        DocumentMember.objects.create(
            document=document,
            user=viewer,
            role=MemberRole.VIEWER,
        )
        self.client.force_authenticate(viewer)

        response = self.client.patch(
            f"/api/documents/{document.id}/",
            {"title": "Forbidden update"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_editor_cannot_manage_document_members(self):
        editor = get_user_model().objects.create_user(
            "restricted-editor",
            "restricted-editor@example.com",
            "password123",
        )
        candidate = get_user_model().objects.create_user(
            "candidate",
            "candidate@example.com",
            "password123",
        )
        document = Document.objects.create(title="Owner controls members", owner=self.user)
        DocumentMember.objects.create(
            document=document,
            user=editor,
            role=MemberRole.EDITOR,
        )
        self.client.force_authenticate(editor)

        response = self.client.post(
            f"/api/documents/{document.id}/members/",
            {"username": candidate.username, "role": MemberRole.VIEWER},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_document_update_service_creates_revision(self):
        document = Document.objects.create(
            title="Original",
            content={"type": "doc", "content": []},
            owner=self.user,
        )

        update_document_with_revision(
            document=document,
            author=self.user,
            new_title="Updated",
            new_content={"type": "doc", "content": [{"type": "paragraph"}]},
        )

        revision = DocumentRevision.objects.get(document=document)
        self.assertEqual(revision.version, 1)
        self.assertEqual(revision.title, "Original")
        document.refresh_from_db()
        self.assertEqual(document.title, "Updated")

    def test_successive_updates_create_unique_revision_versions(self):
        document = Document.objects.create(
            title="Version zero",
            content={"type": "doc", "content": []},
            owner=self.user,
        )

        update_document_with_revision(
            document=document,
            author=self.user,
            new_title="Version one",
            new_content={"version": 1},
        )
        update_document_with_revision(
            document=document,
            author=self.user,
            new_title="Version two",
            new_content={"version": 2},
        )

        self.assertEqual(
            list(
                DocumentRevision.objects.filter(document=document)
                .order_by("version")
                .values_list("version", flat=True)
            ),
            [1, 2],
        )


class DocumentRevisionConcurrencyTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            "concurrent-owner",
            "concurrent-owner@example.com",
            "password123",
        )
        self.document = Document.objects.create(
            title="Original",
            content={"version": 0},
            owner=self.user,
        )

    def test_simultaneous_updates_receive_unique_revision_versions(self):
        barrier = Barrier(2)

        def update(number):
            close_old_connections()
            try:
                document = Document.objects.get(pk=self.document.pk)
                user = get_user_model().objects.get(pk=self.user.pk)
                barrier.wait()
                update_document_with_revision(
                    document=document,
                    author=user,
                    new_title=f"Update {number}",
                    new_content={"version": number},
                )
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [executor.submit(update, number) for number in (1, 2)]
            for future in futures:
                future.result()

        self.assertEqual(
            list(
                DocumentRevision.objects.filter(document=self.document)
                .order_by("version")
                .values_list("version", flat=True)
            ),
            [1, 2],
        )
