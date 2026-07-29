from django.conf import settings
from django.contrib.auth.models import AbstractUser, UserManager
from django.contrib.auth.hashers import make_password
from django.db import models


class ZealUserManager(UserManager):
    def _create_user(self, username, email, password, **extra_fields):
        if not username:
            raise ValueError("The username must be set")
        user = self.model(
            username=self.model.normalize_username(username),
            email=self.normalize_email(email) if email else None,
            **extra_fields,
        )
        user.password = make_password(password)
        user.save(using=self._db)
        return user


class User(AbstractUser):
    email = models.EmailField(unique=True, null=True, blank=True)
    objects = ZealUserManager()

    def __str__(self):
        return self.username


class SocialAccount(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="social_accounts",
    )
    provider = models.CharField(max_length=50)
    provider_user_id = models.CharField(max_length=255)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "provider_user_id"],
                name="unique_social_provider_account",
            )
        ]


class WebhookEvent(models.Model):
    provider = models.CharField(max_length=50)
    event_id = models.CharField(max_length=255)
    payload = models.JSONField()
    received_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "event_id"],
                name="unique_webhook_event",
            )
        ]


class EmailVerification(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_verification",
    )
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        state = "verified" if self.is_verified else "unverified"
        return f"{self.user} ({state})"
