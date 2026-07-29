from django.test import TestCase


class StatusPageTests(TestCase):
    def test_status_template_renders(self):
        response = self.client.get("/status/")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Zeal API")
        self.assertTemplateUsed(response, "status.html")
