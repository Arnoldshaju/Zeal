from celery import shared_task
from django.core.mail import send_mail


@shared_task
def celery_healthcheck():
    return "ok"


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
