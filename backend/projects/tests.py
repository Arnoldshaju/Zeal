from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from teams.models import Team
from workspaces.models import Workspace, WorkspaceMember, WorkspaceRole

from .models import (
    ActivityLog,
    Notification,
    Project,
    ProjectMembership,
    ProjectRole,
    Task,
    TaskPriority,
    TaskStatus,
)
from .tasks import send_due_task_reminders


class ProjectModelTests(TestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_user(
            "project-model-owner",
            password="password123",
        )
        self.workspace = Workspace.objects.create(
            name="Projects",
            slug="project-model-tests",
            owner=self.owner,
        )
        self.project = Project.objects.create(
            workspace=self.workspace,
            name="Zeal PM",
            created_by=self.owner,
        )

    def test_done_task_sets_completed_timestamp(self):
        task = Task.objects.create(
            project=self.project,
            title="Ship feature",
            status=TaskStatus.DONE,
            created_by=self.owner,
            assignee=self.owner,
        )
        self.assertIsNotNone(task.completed_at)

        task.status = TaskStatus.TODO
        task.save()
        self.assertIsNone(task.completed_at)


class ProjectApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.owner = get_user_model().objects.create_user(
            "project-owner",
            "project-owner@example.com",
            "password123",
        )
        self.contributor = get_user_model().objects.create_user(
            "project-contributor",
            "project-contributor@example.com",
            "password123",
        )
        self.viewer = get_user_model().objects.create_user(
            "project-viewer",
            "project-viewer@example.com",
            "password123",
        )
        self.stranger = get_user_model().objects.create_user(
            "project-stranger",
            "project-stranger@example.com",
            "password123",
        )
        self.workspace = Workspace.objects.create(
            name="Project API",
            slug="project-api",
            owner=self.owner,
        )
        for user in (self.contributor, self.viewer):
            WorkspaceMember.objects.create(
                workspace=self.workspace,
                user=user,
                role=WorkspaceRole.MEMBER,
            )
        self.team = Team.objects.create(
            workspace=self.workspace,
            name="Engineering",
            created_by=self.owner,
        )
        self.client.force_authenticate(self.owner)
        response = self.client.post(
            "/api/v1/projects/",
            {
                "workspace": str(self.workspace.id),
                "team": str(self.team.id),
                "name": "Zeal Project",
                "status": "ACTIVE",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.project = Project.objects.get(pk=response.data["id"])
        ProjectMembership.objects.create(
            project=self.project,
            user=self.contributor,
            role=ProjectRole.CONTRIBUTOR,
        )
        ProjectMembership.objects.create(
            project=self.project,
            user=self.viewer,
            role=ProjectRole.VIEWER,
        )

    def test_project_creation_records_manager_and_activity(self):
        self.assertTrue(
            self.project.memberships.filter(
                user=self.owner,
                role=ProjectRole.MANAGER,
            ).exists()
        )
        self.assertTrue(
            ActivityLog.objects.filter(
                project=self.project,
                action="project.created",
            ).exists()
        )

    def test_task_creation_assignment_notification_and_filters(self):
        created = self.client.post(
            "/api/v1/tasks/",
            {
                "project": str(self.project.id),
                "title": "Build task API",
                "priority": TaskPriority.HIGH,
                "assignee": self.contributor.id,
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.contributor,
                kind="task.assigned",
            ).exists()
        )
        filtered = self.client.get(
            f"/api/v1/tasks/?project={self.project.id}&priority=HIGH&search=task"
        )
        self.assertEqual(filtered.status_code, status.HTTP_200_OK)
        self.assertEqual(filtered.data["count"], 1)

    def test_viewer_can_read_but_cannot_update_task(self):
        task = Task.objects.create(
            project=self.project,
            title="Read only",
            created_by=self.owner,
        )
        self.client.force_authenticate(self.viewer)
        self.assertEqual(
            self.client.get(f"/api/v1/tasks/{task.id}/").status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            self.client.patch(
                f"/api/v1/tasks/{task.id}/",
                {"title": "Forbidden"},
                format="json",
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_stranger_cannot_see_project_or_task(self):
        task = Task.objects.create(
            project=self.project,
            title="Private",
            created_by=self.owner,
        )
        self.client.force_authenticate(self.stranger)
        self.assertEqual(self.client.get("/api/v1/projects/").data["results"], [])
        self.assertEqual(
            self.client.get(f"/api/v1/tasks/{task.id}/").status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_task_comment_and_attachment_are_recorded(self):
        task = Task.objects.create(
            project=self.project,
            title="Discuss",
            created_by=self.owner,
            assignee=self.contributor,
        )
        comment = self.client.post(
            f"/api/v1/tasks/{task.id}/comments/",
            {"body": "Ready for review"},
            format="json",
        )
        attachment = self.client.post(
            f"/api/v1/tasks/{task.id}/attachments/",
            {"file": SimpleUploadedFile("notes.txt", b"task notes")},
            format="multipart",
        )
        self.assertEqual(comment.status_code, status.HTTP_201_CREATED)
        self.assertEqual(attachment.status_code, status.HTTP_201_CREATED)
        self.assertEqual(task.activity_logs.count(), 2)

    def test_attachment_rejects_bad_extension_and_large_file(self):
        task = Task.objects.create(
            project=self.project,
            title="Uploads",
            created_by=self.owner,
        )
        bad_type = self.client.post(
            f"/api/v1/tasks/{task.id}/attachments/",
            {"file": SimpleUploadedFile("script.exe", b"bad")},
            format="multipart",
        )
        too_large = self.client.post(
            f"/api/v1/tasks/{task.id}/attachments/",
            {"file": SimpleUploadedFile("large.txt", b"x" * (10 * 1024 * 1024 + 1))},
            format="multipart",
        )
        self.assertEqual(bad_type.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(too_large.status_code, status.HTTP_400_BAD_REQUEST)

    def test_project_stats_and_notification_read_actions(self):
        Task.objects.create(
            project=self.project,
            title="Todo",
            created_by=self.owner,
        )
        Task.objects.create(
            project=self.project,
            title="Done",
            status=TaskStatus.DONE,
            created_by=self.owner,
        )
        stats_response = self.client.get(f"/api/v1/projects/{self.project.id}/stats/")
        self.assertEqual(stats_response.status_code, status.HTTP_200_OK)
        self.assertEqual(stats_response.data["total"], 2)
        self.assertEqual(stats_response.data["by_status"]["DONE"], 1)

        notification = Notification.objects.create(
            recipient=self.owner,
            kind="test",
            message="Read this",
        )
        read = self.client.post(f"/api/v1/notifications/{notification.id}/read/")
        self.assertEqual(read.status_code, status.HTTP_200_OK)
        notification.refresh_from_db()
        self.assertIsNotNone(notification.read_at)


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class ProjectTaskTests(TestCase):
    def test_due_reminder_is_idempotent(self):
        owner = get_user_model().objects.create_user(
            "reminder-owner",
            password="password123",
        )
        assignee = get_user_model().objects.create_user(
            "reminder-assignee",
            password="password123",
        )
        workspace = Workspace.objects.create(
            name="Reminders",
            slug="reminders",
            owner=owner,
        )
        project = Project.objects.create(
            workspace=workspace,
            name="Reminder project",
            created_by=owner,
        )
        ProjectMembership.objects.create(
            project=project,
            user=assignee,
            role=ProjectRole.CONTRIBUTOR,
        )
        Task.objects.create(
            project=project,
            title="Due soon",
            created_by=owner,
            assignee=assignee,
            due_date=timezone.localdate() + timedelta(days=1),
        )

        self.assertEqual(send_due_task_reminders(), 1)
        self.assertEqual(send_due_task_reminders(), 0)
        self.assertEqual(Notification.objects.filter(recipient=assignee).count(), 1)
