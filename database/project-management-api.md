# Zeal project-management API

Zeal treats an existing `Workspace` as an organization. Teams and projects
live inside a workspace, while tasks live inside projects.

## Resource hierarchy

```text
Workspace
├── Team
│   └── TeamMembership
└── Project
    ├── ProjectMembership
    ├── Task
    │   ├── TaskComment
    │   ├── TaskAttachment
    │   └── Notification
    └── ActivityLog
```

All endpoints require a JWT access token:

```http
Authorization: Bearer ACCESS_TOKEN
```

Interactive OpenAPI documentation is available at
`http://localhost:8000/api/docs/`.

## Endpoints

### Teams

```text
GET, POST          /api/v1/teams/
GET, PATCH, DELETE /api/v1/teams/{id}/
GET, POST          /api/v1/teams/{id}/members/
PATCH, DELETE      /api/v1/teams/{id}/members/{user_id}/
```

### Projects

```text
GET, POST          /api/v1/projects/
GET, PATCH, DELETE /api/v1/projects/{id}/
GET, POST          /api/v1/projects/{id}/members/
GET                /api/v1/projects/{id}/activity/
GET                /api/v1/projects/{id}/stats/
```

Project list filters support `workspace`, `team`, `status`, `search`, and
`ordering`.

### Tasks

```text
GET, POST          /api/v1/tasks/
GET, PATCH, DELETE /api/v1/tasks/{id}/
GET, POST          /api/v1/tasks/{id}/comments/
GET, POST          /api/v1/tasks/{id}/attachments/
```

Task list filters support `project`, `status`, `priority`, `assignee`,
`search`, and `ordering`.

Attachments are limited to 10 MB and `.txt`, `.pdf`, `.png`, or `.jpg`.

### Notifications

```text
GET  /api/v1/notifications/
POST /api/v1/notifications/{id}/read/
POST /api/v1/notifications/read-all/
```

## Permission matrix

| Role | Read | Create tasks | Modify tasks | Manage project |
|---|---:|---:|---:|---:|
| Workspace owner/admin | Yes | Yes | Yes | Yes |
| Project manager | Yes | Yes | Yes | Yes |
| Contributor | Yes | Yes | Assigned or created | No |
| Viewer | Yes | No | No | No |

Access is enforced by backend QuerySets and object permissions. Hiding a
frontend button is not treated as authorization.

## Activity, notifications, jobs, and caching

Activity records cover project and task changes, comments, and uploads.
Notifications cover assignments, comments, and due dates.

Celery Beat runs `projects.tasks.send_due_task_reminders` every 24 hours.
`reminder_sent_at` prevents duplicate reminders.

`GET /api/v1/projects/{id}/stats/` caches task totals in Redis for 60 seconds.
Task creation, update, and deletion invalidate this cache.

## Tests

```bash
docker compose exec backend python manage.py test teams projects
docker compose exec backend python manage.py test
```
