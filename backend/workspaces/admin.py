from django.contrib import admin

from .models import AuditLog, Workspace, WorkspaceInvitation, WorkspaceMember


admin.site.register(Workspace)
admin.site.register(WorkspaceMember)
admin.site.register(WorkspaceInvitation)
admin.site.register(AuditLog)
