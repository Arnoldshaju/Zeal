from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import EmailVerification, SocialAccount, User, WebhookEvent


@admin.register(User)
class ZealUserAdmin(UserAdmin):
    pass


admin.site.register(SocialAccount)
admin.site.register(WebhookEvent)


@admin.register(EmailVerification)
class EmailVerificationAdmin(admin.ModelAdmin):
    list_display = ("user", "is_verified", "verified_at", "created_at")
    list_filter = ("is_verified",)
    search_fields = ("user__username", "user__email")
