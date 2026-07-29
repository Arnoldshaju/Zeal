from unittest.mock import patch

from django.core.cache import cache
from django.http import HttpResponse
from django.test import TestCase


class StatusPageTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_status_template_renders(self):
        response = self.client.get("/status/")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Zeal API")
        self.assertContains(response, "Running locally")
        self.assertTemplateUsed(response, "status.html")

    @patch("config.views.render")
    def test_status_page_response_is_cached(self, mocked_render):
        mocked_render.return_value = HttpResponse("Zeal API is Running locally")

        first = self.client.get("/status/")
        second = self.client.get("/status/")

        self.assertEqual(first.content, second.content)
        self.assertEqual(mocked_render.call_count, 1)
