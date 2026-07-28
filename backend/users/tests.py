from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase


class AuthenticationTests(APITestCase):
    def test_register_login_and_current_user(self):
        registration = self.client.post(
            "/api/auth/register/",
            {"username": "arnold", "email": "Arnold@Example.com", "password": "StrongPassword123!"},
            format="json",
        )
        self.assertEqual(registration.status_code, status.HTTP_201_CREATED)
        user = get_user_model().objects.get(username="arnold")
        self.assertEqual(user.email, "arnold@example.com")
        self.assertTrue(user.check_password("StrongPassword123!"))

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

    def test_duplicate_email_is_rejected_case_insensitively(self):
        get_user_model().objects.create_user("first", "person@example.com", "password123")
        response = self.client.post(
            "/api/auth/register/",
            {"username": "second", "email": "PERSON@example.com", "password": "password123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_minimum_length_is_four_characters(self):
        too_short = self.client.post(
            "/api/auth/register/",
            {"username": "short", "email": "short@example.com", "password": "abc"},
            format="json",
        )
        self.assertEqual(too_short.status_code, status.HTTP_400_BAD_REQUEST)

        accepted = self.client.post(
            "/api/auth/register/",
            {"username": "valid", "email": "valid@example.com", "password": "abcd"},
            format="json",
        )
        self.assertEqual(accepted.status_code, status.HTTP_201_CREATED)
