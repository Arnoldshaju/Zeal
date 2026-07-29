from datetime import timedelta
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.cache import cache
from django.core.management import call_command
from django.test import override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from documents.models import Comment, Document
from users.models import EmailVerification
from users.tokens import email_verification_token_generator
from workspaces.services import create_workspace


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class AuthenticationTests(APITestCase):
    def test_register_login_and_current_user(self):
        with self.captureOnCommitCallbacks(execute=True):
            registration = self.client.post(
                "/api/auth/register/",
                {
                    "username": "arnold",
                    "email": "Arnold@Example.com",
                    "password": "StrongPassword123!",
                },
                format="json",
            )
        self.assertEqual(registration.status_code, status.HTTP_201_CREATED)
        user = get_user_model().objects.get(username="arnold")
        self.assertEqual(user.email, "arnold@example.com")
        self.assertTrue(user.check_password("StrongPassword123!"))
        self.assertFalse(user.email_verification.is_verified)
        self.assertEqual(len(mail.outbox), 1)

        unverified_login = self.client.post(
            "/api/auth/login/",
            {"username": "arnold", "password": "StrongPassword123!"},
            format="json",
        )
        self.assertEqual(unverified_login.status_code, status.HTTP_400_BAD_REQUEST)

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        verification = self.client.post(
            "/api/auth/verify-email/confirm/",
            {
                "uid": uid,
                "token": email_verification_token_generator.make_token(user),
            },
            format="json",
        )
        self.assertEqual(verification.status_code, status.HTTP_200_OK)

        login = self.client.post(
            "/api/auth/login/",
            {"username": "arnold", "password": "StrongPassword123!"},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.assertIn("access", login.data)
        self.assertIn("refresh", login.data)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        current_user = self.client.get("/api/auth/me/")
        self.assertEqual(current_user.status_code, status.HTTP_200_OK)
        self.assertEqual(current_user.data["username"], "arnold")
        self.assertTrue(current_user.data["is_email_verified"])

    def test_duplicate_email_is_rejected_case_insensitively(self):
        get_user_model().objects.create_user("first", "person@example.com", "password123")
        response = self.client.post(
            "/api/auth/register/",
            {"username": "second", "email": "PERSON@example.com", "password": "password123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_registration_succeeds_when_email_provider_rejects_delivery(self):
        with patch(
            "users.tasks.send_mail",
            side_effect=RuntimeError("Email provider unavailable"),
        ):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(
                    "/api/auth/register/",
                    {
                        "username": "email-failure",
                        "email": "email-failure@example.com",
                        "password": "StrongPassword123!",
                    },
                    format="json",
                )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            get_user_model().objects.filter(username="email-failure").exists()
        )

    @override_settings(DEBUG=True)
    def test_password_reset_changes_password_without_revealing_accounts(self):
        user = get_user_model().objects.create_user(
            "reset-user", "reset@example.com", "OldPassword123!"
        )
        request = self.client.post(
            "/api/auth/password-reset/request/",
            {"email": "RESET@example.com"},
            format="json",
        )
        self.assertEqual(request.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("debug_url", request.data)

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        confirmation = self.client.post(
            "/api/auth/password-reset/confirm/",
            {
                "uid": uid,
                "token": default_token_generator.make_token(user),
                "new_password": "NewPassword123!",
            },
            format="json",
        )
        self.assertEqual(confirmation.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.check_password("NewPassword123!"))
        self.assertFalse(user.check_password("OldPassword123!"))

        unknown = self.client.post(
            "/api/auth/password-reset/request/",
            {"email": "missing@example.com"},
            format="json",
        )
        self.assertEqual(unknown.status_code, status.HTTP_200_OK)
        self.assertEqual(request.data["detail"], unknown.data["detail"])
        self.assertNotIn("debug_url", unknown.data)

    def test_logout_blacklists_refresh_token(self):
        user = get_user_model().objects.create_user(
            "logout-user", "logout@example.com", "password123"
        )
        login = self.client.post(
            "/api/auth/login/",
            {"username": user.username, "password": "password123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        logout = self.client.post(
            "/api/auth/logout/",
            {"refresh": login.data["refresh"]},
            format="json",
        )
        self.assertEqual(logout.status_code, status.HTTP_204_NO_CONTENT)

        self.client.credentials()
        refresh = self.client.post(
            "/api/auth/refresh/",
            {"refresh": login.data["refresh"]},
            format="json",
        )
        self.assertEqual(refresh.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_protected_endpoint_requires_authentication(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalid_login_is_rejected(self):
        get_user_model().objects.create_user(
            "invalid-login",
            "invalid-login@example.com",
            "CorrectPassword123!",
        )

        response = self.client.post(
            "/api/auth/login/",
            {"username": "invalid-login", "password": "WrongPassword123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_expired_access_token_is_rejected(self):
        user = get_user_model().objects.create_user(
            "expired-token",
            "expired-token@example.com",
            "password123",
        )
        token = AccessToken.for_user(user)
        token.set_exp(lifetime=timedelta(seconds=-1))
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalid_email_verification_token_is_rejected(self):
        user = get_user_model().objects.create_user(
            "verify-user", "verify@example.com", "password123"
        )
        EmailVerification.objects.create(user=user)
        response = self.client.post(
            "/api/auth/verify-email/confirm/",
            {
                "uid": urlsafe_base64_encode(force_bytes(user.pk)),
                "token": "invalid-token",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_reset_token_cannot_be_reused(self):
        user = get_user_model().objects.create_user(
            "single-use-reset",
            "single-use-reset@example.com",
            "OldPassword123!",
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        payload = {
            "uid": uid,
            "token": token,
            "new_password": "NewPassword123!",
        }

        first = self.client.post(
            "/api/auth/password-reset/confirm/",
            payload,
            format="json",
        )
        second = self.client.post(
            "/api/auth/password-reset/confirm/",
            payload,
            format="json",
        )

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)


class AuthenticationThrottleTests(APITestCase):
    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_anonymous_requests_are_rate_limited(self):
        payload = {"username": "missing-user", "password": "WrongPassword123!"}

        responses = [
            self.client.post("/api/auth/login/", payload, format="json")
            for _ in range(101)
        ]

        self.assertTrue(
            all(
                response.status_code == status.HTTP_401_UNAUTHORIZED
                for response in responses[:100]
            )
        )
        self.assertEqual(
            responses[100].status_code,
            status.HTTP_429_TOO_MANY_REQUESTS,
        )


class ProjectStatsCommandTests(APITestCase):
    def test_project_stats_prints_all_counts(self):
        user = get_user_model().objects.create_user(
            "stats-user", "stats@example.com", "password123"
        )
        workspace = create_workspace(owner=user, name="Stats")
        document = Document.objects.create(
            owner=user, workspace=workspace, title="Stats document"
        )
        Comment.objects.create(document=document, author=user, body="Open comment")
        Comment.objects.create(
            document=document,
            author=user,
            body="Resolved comment",
            is_resolved=True,
        )

        output = StringIO()
        call_command("project_stats", stdout=output)

        rendered = output.getvalue()
        self.assertIn("Number of users: 1", rendered)
        self.assertIn("Number of workspaces: 1", rendered)
        self.assertIn("Number of documents: 1", rendered)
        self.assertIn("Number of unresolved comments: 1", rendered)

    def test_password_minimum_length_is_eight_characters(self):
        too_short = self.client.post(
            "/api/auth/register/",
            {
                "username": "short",
                "email": "short@example.com",
                "password": "Abcd12!",
            },
            format="json",
        )
        self.assertEqual(too_short.status_code, status.HTTP_400_BAD_REQUEST)

        accepted = self.client.post(
            "/api/auth/register/",
            {
                "username": "valid",
                "email": "valid@example.com",
                "password": "Abcde12!",
            },
            format="json",
        )
        self.assertEqual(accepted.status_code, status.HTTP_201_CREATED)
