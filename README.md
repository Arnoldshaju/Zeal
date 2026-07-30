# Zeal

> A workspace-based collaborative document editor built with Next.js, Django, PostgreSQL, Redis, Celery, and WebSockets.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Django](https://img.shields.io/badge/Django-4.2-0C4B33?logo=django)](https://www.djangoproject.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Celery](https://img.shields.io/badge/Celery-5-37814A?logo=celery&logoColor=white)](https://docs.celeryq.dev/)

Zeal lets users create personal and team workspaces, manage projects and task
workflows, edit rich-text documents, upload attachments, and collaborate
through live WebSocket updates. The complete development stack runs through
Docker Compose and works with OrbStack.

> [!NOTE]
> Zeal is under active development. APIs and user-facing workflows may change.

## Features

- Custom Django user model and authorization groups
- JWT authentication, rotation, refresh, logout, and blacklisting
- Email verification and password reset
- Personal and team workspaces
- Teams, projects, project memberships, and task workflows
- Task comments, attachments, activity history, and notifications
- Redis-cached project statistics and scheduled due-date reminders
- Owner, administrator, member, editor, and viewer permissions
- Rich-text document editing with Tiptap
- Tags, comments, attachments, and document revisions
- PostgreSQL row locking for concurrent revision creation
- Filtering, search, ordering, and pagination
- Idempotent document creation
- Redis-backed WebSocket collaboration and presence
- Celery background email and webhook processing
- Celery Beat scheduled invitation cleanup
- Signed, idempotent webhook ingestion
- OpenAPI schema and interactive Swagger documentation
- 60 backend tests covering documents, authentication, workspaces, teams, and projects

## Architecture

```text
Browser
  ├── HTTP :3000 ──► Next.js frontend
  │                     └── /api ──► Django REST API :8000
  └── WebSocket :8000 ────────────► Django Channels
                                           │
                         ┌─────────────────┴─────────────────┐
                         ▼                                   ▼
                    PostgreSQL                          Redis
                                                           │
                                            ┌──────────────┴──────────────┐
                                            ▼                             ▼
                                      Celery worker                  Celery Beat
```

| Service | Container | Purpose | Host port |
| --- | --- | --- | --- |
| `frontend` | `zeal-frontend` | Next.js development server | `3000` |
| `backend` | `zeal-backend` | Django REST API and Daphne | `8000` |
| `postgres` | `zeal-postgres` | Permanent relational data | Internal |
| `redis` | `zeal-redis` | Channels, cache, throttling, and Celery | `6379` |
| `celery-worker` | `zeal-celery-worker` | Background jobs | Internal |
| `celery-beat` | `zeal-celery-beat` | Recurring-job scheduler | Internal |

Redis logical databases are separated by responsibility:

```text
0 → Channels/WebSockets
1 → Django cache and API throttling
2 → Celery task queue
3 → Celery results
```

## Technology

| Layer | Tools |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS, Tiptap |
| Backend | Python, Django, Django REST Framework, django-filter |
| Authentication | Custom Django user, groups, Simple JWT |
| API documentation | drf-spectacular and Swagger UI |
| Database | PostgreSQL 17 |
| Real-time communication | Django Channels, Daphne, Redis |
| Background jobs | Celery worker and Celery Beat |
| Development infrastructure | Docker Compose and OrbStack |

## Quick start

Install Git and [OrbStack](https://orbstack.dev/), then:

```bash
git clone https://github.com/Arnoldshaju/Zeal.git
cd Zeal
open -a OrbStack
docker context use orbstack
docker compose up --build -d
docker compose ps
```

Open:

- Frontend: [http://localhost:3000](http://localhost:3000)
- API health: [http://localhost:8000/api/health/](http://localhost:8000/api/health/)
- Swagger: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
- Django status template: [http://localhost:8000/status/](http://localhost:8000/status/)
- Django admin: [http://localhost:8000/admin/](http://localhost:8000/admin/)

Register a new account from the frontend. New users automatically receive a personal workspace.

## Development commands

```bash
# Service status and logs
docker compose ps
docker compose logs -f
docker compose logs -f backend
docker compose logs -f celery-worker
docker compose logs -f celery-beat

# Django
docker compose exec backend python manage.py check
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_roles
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py collectstatic --noinput

# Tests and coverage
docker compose exec backend python manage.py test
docker compose exec backend coverage erase
docker compose exec backend coverage run manage.py test
docker compose exec backend coverage report

# Frontend validation
docker compose exec frontend npm run lint
docker compose exec frontend npm run build

# Infrastructure checks
docker compose exec redis redis-cli ping
docker compose exec postgres psql -U zeal -d zeal
```

Stop containers while preserving PostgreSQL data:

```bash
docker compose down
```

> [!WARNING]
> `docker compose down -v` deletes the PostgreSQL volume and all local application data.

## API overview

Authentication:

```text
POST /api/auth/register/
POST /api/auth/login/
POST /api/auth/refresh/
POST /api/auth/logout/
GET  /api/auth/me/
POST /api/auth/verify-email/request/
POST /api/auth/verify-email/confirm/
POST /api/auth/password-reset/request/
POST /api/auth/password-reset/confirm/
POST /api/auth/webhooks/
```

Workspaces:

```text
GET    /api/workspaces/
POST   /api/workspaces/
GET    /api/workspaces/{id}/
PATCH  /api/workspaces/{id}/
DELETE /api/workspaces/{id}/
GET    /api/workspaces/{id}/members/
POST   /api/workspaces/{id}/members/
PATCH  /api/workspaces/{id}/members/{user_id}/
DELETE /api/workspaces/{id}/members/{user_id}/
```

Documents support standard CRUD plus:

```text
GET  /api/documents/?workspace={workspace_id}
GET  /api/documents/?search=project
GET  /api/documents/?ordering=-updated_at
GET  /api/documents/?page=2
POST /api/documents/{id}/attachments/
GET  /api/documents/{id}/attachments/
```

Send an `Idempotency-Key` header with document creation to make retries safe. Repeating the same request returns the original response; reusing the key with different data returns HTTP `409`.

The same application endpoints are available under `/api/v1/`.

## Project structure

```text
Zeal/
├── apps/web/                    # Next.js frontend
├── backend/
│   ├── collaboration/           # WebSocket consumers and middleware
│   ├── config/                  # Django, Celery, URLs, and settings
│   ├── documents/               # Documents, revisions, uploads, and API
│   ├── templates/               # Django templates
│   ├── users/                   # Users, authentication, tasks, and webhooks
│   └── workspaces/              # Workspaces, roles, invitations, and audit logs
├── database/                    # Database design and operational documentation
├── docker-compose.yml
├── LEARNING_GUIDE.md
└── README.md
```

## Learning

Follow [LEARNING_GUIDE.md](LEARNING_GUIDE.md) to study and practise Django Weeks 24–30 using the features already implemented in Zeal.

## Current limitations

- Social-account storage exists, but real Google/GitHub OAuth callbacks are not connected.
- Attachments do not yet have controls in the Next.js editor.
- Revision history, tags, audit logs, and workspace invitations need complete frontend workflows.
- Production security and deployment hardening are Week 31 work.
