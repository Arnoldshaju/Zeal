from django.contrib import admin

from .models import (
    ApiIdempotencyRecord,
    Comment,
    Document,
    DocumentAttachment,
    DocumentMember,
    DocumentRevision,
    Tag,
)


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "created_at", "updated_at")
    search_fields = ("title", "owner__username", "owner__email")


@admin.register(DocumentMember)
class DocumentMemberAdmin(admin.ModelAdmin):
    list_display = ("document", "user", "role", "created_at")
    list_filter = ("role",)

@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name", "color", "created_at")
    search_fields = ("name",)


@admin.register(DocumentRevision)
class DocumentRevisionAdmin(admin.ModelAdmin):
    list_display = ("document", "version", "author", "created_at")
    list_filter = ("created_at",)
    search_fields = ("document__title", "author__username")


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("document", "author", "is_resolved", "created_at")
    list_filter = ("is_resolved", "created_at")
    search_fields = ("document__title", "author__username", "body")


admin.site.register(DocumentAttachment)
admin.site.register(ApiIdempotencyRecord)
