import secrets

from django.conf import settings
from django.db import transaction
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import WebhookEvent
from .tasks import process_webhook_event


class WebhookSerializer(serializers.Serializer):
    provider = serializers.CharField(max_length=50)
    event_id = serializers.CharField(max_length=255)
    payload = serializers.JSONField()


class WebhookView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    serializer_class = WebhookSerializer

    @transaction.atomic
    def post(self, request):
        provided_secret = request.headers.get("X-Zeal-Webhook-Secret", "")
        if not secrets.compare_digest(provided_secret, settings.WEBHOOK_SECRET):
            return Response(status=status.HTTP_401_UNAUTHORIZED)

        serializer = WebhookSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event, created = WebhookEvent.objects.get_or_create(
            provider=serializer.validated_data["provider"],
            event_id=serializer.validated_data["event_id"],
            defaults={"payload": serializer.validated_data["payload"]},
        )
        if created:
            transaction.on_commit(lambda: process_webhook_event.delay(event.pk))
        return Response(
            {"accepted": True, "duplicate": not created},
            status=status.HTTP_202_ACCEPTED,
        )
