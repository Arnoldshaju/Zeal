from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from workspaces.models import Workspace, WorkspaceMember, WorkspaceRole

from .models import Team, TeamMembership, TeamRole


class TeamModelTests(TestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_user(
            "team-owner",
            "team-owner@example.com",
            "password123",
        )
        self.workspace = Workspace.objects.create(
            name="Acme",
            slug="acme-team-tests",
            owner=self.owner,
        )

    def test_team_name_is_unique_per_workspace(self):
        Team.objects.create(
            workspace=self.workspace,
            name="Engineering",
            created_by=self.owner,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Team.objects.create(
                    workspace=self.workspace,
                    name="Engineering",
                    created_by=self.owner,
                )

    def test_team_member_cannot_be_added_twice(self):
        user = get_user_model().objects.create_user("member", password="password123")
        team = Team.objects.create(
            workspace=self.workspace,
            name="Product",
            created_by=self.owner,
        )
        TeamMembership.objects.create(team=team, user=user)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                TeamMembership.objects.create(team=team, user=user)


class TeamApiTests(APITestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_user(
            "team-api-owner",
            "team-api-owner@example.com",
            "password123",
        )
        self.member = get_user_model().objects.create_user(
            "team-api-member",
            "team-api-member@example.com",
            "password123",
        )
        self.workspace = Workspace.objects.create(
            name="Team API",
            slug="team-api",
            owner=self.owner,
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.member,
            role=WorkspaceRole.MEMBER,
        )
        self.client.force_authenticate(self.owner)

    def test_owner_can_create_team_and_add_workspace_member(self):
        created = self.client.post(
            "/api/v1/teams/",
            {
                "workspace": str(self.workspace.id),
                "name": "Engineering",
                "description": "Builds Zeal",
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        team_id = created.data["id"]
        self.assertTrue(
            TeamMembership.objects.filter(
                team_id=team_id,
                user=self.owner,
                role=TeamRole.OWNER,
            ).exists()
        )

        membership = self.client.post(
            f"/api/v1/teams/{team_id}/members/",
            {"username": self.member.username, "role": TeamRole.MEMBER},
            format="json",
        )
        self.assertEqual(membership.status_code, status.HTTP_201_CREATED)

    def test_regular_workspace_member_cannot_create_team(self):
        self.client.force_authenticate(self.member)
        response = self.client.post(
            "/api/v1/teams/",
            {"workspace": str(self.workspace.id), "name": "Forbidden"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
