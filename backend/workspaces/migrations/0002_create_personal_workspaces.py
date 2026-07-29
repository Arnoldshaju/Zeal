from django.db import migrations


def create_personal_workspaces(apps, schema_editor):
    User = apps.get_model("users", "User")
    Workspace = apps.get_model("workspaces", "Workspace")
    WorkspaceMember = apps.get_model("workspaces", "WorkspaceMember")
    Document = apps.get_model("documents", "Document")

    for user in User.objects.all().iterator():
        workspace, _ = Workspace.objects.get_or_create(
            owner_id=user.pk,
            slug=f"personal-{user.pk}",
            defaults={"name": f"{user.username}'s Workspace"},
        )
        WorkspaceMember.objects.update_or_create(
            workspace_id=workspace.pk,
            user_id=user.pk,
            defaults={"role": "OWNER"},
        )
        Document.objects.filter(owner_id=user.pk, workspace_id__isnull=True).update(
            workspace_id=workspace.pk
        )


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0003_comment_documentrevision_document_workspace_and_more"),
        ("workspaces", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_personal_workspaces, migrations.RunPython.noop),
    ]
