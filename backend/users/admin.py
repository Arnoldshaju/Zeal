from django.contrib import admin

from .models import EmailVerification


@admin.register(EmailVerification)
class EmailVerificationAdmin(admin.ModelAdmin):
    list_display = ("user", "is_verified", "verified_at", "created_at")
    list_filter = ("is_verified",)
    search_fields = ("user__username", "user__email")
