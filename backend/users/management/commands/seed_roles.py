from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create Zeal's standard Django authorization groups."

    def handle(self, *args, **options):
        role_permissions = {
            "Zeal Owners": Permission.objects.filter(
                content_type__app_label__in=["documents", "workspaces"]
            ),
            "Zeal Editors": Permission.objects.filter(
                content_type__app_label="documents",
                codename__in=["view_document", "change_document"],
            ),
            "Zeal Viewers": Permission.objects.filter(
                content_type__app_label="documents",
                codename="view_document",
            ),
        }
        for name, permissions in role_permissions.items():
            group, _ = Group.objects.get_or_create(name=name)
            group.permissions.set(permissions)
            self.stdout.write(self.style.SUCCESS(f"Configured {name}"))
