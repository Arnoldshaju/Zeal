from celery import shared_task
from django.utils import timezone

from .models import WorkspaceInvitation


@shared_task
def delete_expired_invitations():
    deleted, _ = WorkspaceInvitation.objects.filter(
        accepted_at__isnull=True,
        expires_at__lt=timezone.now(),
    ).delete()
    return deleted
