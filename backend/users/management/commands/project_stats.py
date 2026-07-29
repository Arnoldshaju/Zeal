from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from documents.models import Comment, Document
from workspaces.models import Workspace


class Command(BaseCommand):
    help = "Print the current numbers of users, workspaces, documents, and unresolved comments."

    def handle(self, *args, **options):
        user_model = get_user_model()

        self.stdout.write(f"Number of users: {user_model.objects.count()}")
        self.stdout.write(f"Number of workspaces: {Workspace.objects.count()}")
        self.stdout.write(f"Number of documents: {Document.objects.count()}")
        self.stdout.write(
            f"Number of unresolved comments: "
            f"{Comment.objects.filter(is_resolved=False).count()}"
        )
