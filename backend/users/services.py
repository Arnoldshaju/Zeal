import logging

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .tasks import send_account_email
from .tokens import email_verification_token_generator


logger = logging.getLogger(__name__)


def _send_account_email(subject, message, recipient):
    try:
        return send_account_email.delay(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            recipient,
        )
    except Exception:
        # A queue outage must not turn a committed account operation into HTTP 500.
        logger.exception("Could not queue account email to %s", recipient)
        return 0


def send_verification_email(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_verification_token_generator.make_token(user)
    link = f"{settings.FRONTEND_URL}/verify-email?uid={uid}&token={token}"
    _send_account_email(
        "Verify your Zeal email",
        f"Verify your email address by opening this link:\n\n{link}",
        user.email,
    )
    return link


def send_password_reset_email(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
    _send_account_email(
        "Reset your Zeal password",
        f"Reset your password by opening this link:\n\n{link}",
        user.email,
    )
    return link
