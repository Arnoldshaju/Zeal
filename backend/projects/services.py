from django.core.cache import cache

from .models import ActivityLog, Notification


def invalidate_project_cache(project_id):
    cache.delete(f"project:{project_id}:stats")


def record_activity(*, project, actor, action, task=None, changes=None):
    return ActivityLog.objects.create(
        workspace=project.workspace,
        project=project,
        task=task,
        actor=actor,
        action=action,
        changes=changes or {},
    )


def notify(*, recipient, actor, task, kind, message):
    if recipient is None or recipient == actor:
        return None
    return Notification.objects.create(
        recipient=recipient,
        actor=actor,
        task=task,
        kind=kind,
        message=message,
        target_url=f"/projects/{task.project_id}/tasks/{task.id}",
    )
