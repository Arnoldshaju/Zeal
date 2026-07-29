from celery import shared_task
from django.core.mail import send_mail
from django.utils import timezone


@shared_task
def celery_healthcheck():
    return "ok"


@shared_task
def process_webhook_event(event_id):
    from .models import WebhookEvent

    event = WebhookEvent.objects.filter(pk=event_id).first()
    if event is None or event.processed_at is not None:
        return False
    event.processed_at = timezone.now()
    event.save(update_fields=["processed_at"])
    return True


@shared_task(
    autoretry_for=(Exception,),
    retry_backoff=True,
    max_retries=3,
)
def send_account_email(subject, message, sender, recipient):
    return send_mail(
        subject,
        message,
        sender,
        [recipient],
        fail_silently=False,
    )
