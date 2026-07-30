from django.contrib import admin

from .models import (
    ActivityLog,
    Notification,
    Project,
    ProjectMembership,
    Task,
    TaskAttachment,
    TaskComment,
)


admin.site.register(Project)
admin.site.register(ProjectMembership)
admin.site.register(Task)
admin.site.register(TaskComment)
admin.site.register(TaskAttachment)
admin.site.register(ActivityLog)
admin.site.register(Notification)
