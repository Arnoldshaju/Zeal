from django.contrib import admin

from .models import Document, DocumentMember


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "created_at", "updated_at")
    search_fields = ("title", "owner__username", "owner__email")


@admin.register(DocumentMember)
class DocumentMemberAdmin(admin.ModelAdmin):
    list_display = ("document", "user", "role", "created_at")
    list_filter = ("role",)
