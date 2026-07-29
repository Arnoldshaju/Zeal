from django.db import transaction
from django.db.models import Max

from .models import DocumentRevision


@transaction.atomic
def update_document_with_revision(
    *,
    document,
    author,
    new_title,
    new_content,
):
    document = (
        document.__class__.objects.select_for_update().get(pk=document.pk)
    )
    latest_version = (
        document.revisions.aggregate(maximum=Max("version"))["maximum"] or 0
    )

    DocumentRevision.objects.create(
        document=document,
        author=author,
        version=latest_version + 1,
        title=document.title,
        content=document.content,
    )

    document.title = new_title
    document.content = new_content
    document.save(update_fields=["title", "content", "updated_at"])

    return document
