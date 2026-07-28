from django.db import transaction
from django.utils.text import slugify

from .models import AuditLog, Workspace, WorkspaceMember, WorkspaceRole


def unique_workspace_slug(name, *, fallback, exclude_id=None):
    base = slugify(name) or fallback
    slug = base
    counter = 2
    queryset = Workspace.objects.all()
    if exclude_id is not None:
        queryset = queryset.exclude(id=exclude_id)
    while queryset.filter(slug=slug).exists():
        slug = f"{base}-{counter}"
        counter += 1
    return slug


@transaction.atomic
def create_personal_workspace(user):
    slug = f"personal-{user.pk}"
    workspace, created = Workspace.objects.get_or_create(
        owner=user,
        slug=slug,
        defaults={"name": f"{user.username}'s Workspace"},
    )
    WorkspaceMember.objects.update_or_create(
        workspace=workspace,
        user=user,
        defaults={"role": WorkspaceRole.OWNER},
    )
    if created:
        AuditLog.objects.create(
            workspace=workspace,
            actor=user,
            action="WORKSPACE_CREATED",
            entity_type="Workspace",
            entity_id=str(workspace.id),
            metadata={"personal": True},
        )
    return workspace


@transaction.atomic
def create_workspace(*, owner, name):
    workspace = Workspace.objects.create(
        owner=owner,
        name=name,
        slug=unique_workspace_slug(name, fallback=f"workspace-{owner.pk}"),
    )
    WorkspaceMember.objects.create(
        workspace=workspace,
        user=owner,
        role=WorkspaceRole.OWNER,
    )
    AuditLog.objects.create(
        workspace=workspace,
        actor=owner,
        action="WORKSPACE_CREATED",
        entity_type="Workspace",
        entity_id=str(workspace.id),
        metadata={"personal": False},
    )
    return workspace

