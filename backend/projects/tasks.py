from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from .models import Notification, Task, TaskStatus


@shared_task
def send_due_task_reminders():
    today = timezone.localdate()
    reminder_date = today + timedelta(days=1)
    tasks = Task.objects.filter(
        due_date__lte=reminder_date,
        status__in=[TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW],
        assignee__isnull=False,
        reminder_sent_at__isnull=True,
    ).select_related("assignee", "project")
    sent = 0
    for task in tasks:
        Notification.objects.create(
            recipient=task.assignee,
            task=task,
            kind="task.due",
            message=f"{task.title} is due on {task.due_date}.",
            target_url=f"/projects/{task.project_id}/tasks/{task.id}",
        )
        task.reminder_sent_at = timezone.now()
        task.save(update_fields=["reminder_sent_at"])
        sent += 1
    return sent
