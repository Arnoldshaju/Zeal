# Zeal

> A workspace-based collaborative document editor built with Next.js, Django, PostgreSQL, and WebSockets.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Django](https://img.shields.io/badge/Django-4.2-0C4B33?logo=django)](https://www.djangoproject.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Celery](https://img.shields.io/badge/Celery-5-37814A?logo=celery&logoColor=white)](https://docs.celeryq.dev/)
[![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)

Zeal lets people organize documents into personal or team workspaces, manage member permissions, edit rich-text content, and receive live updates through WebSockets. The full development stack runs in containers and works with OrbStack or any Docker Compose-compatible engine.

> [!NOTE]
> Zeal is under active development. Features and APIs may change.

## Highlights

- User registration and JWT-based authentication
- Custom Django user model and reusable Django authorization groups
- Automatic access-token renewal
- Email verification for new accounts
- Password-reset request and confirmation flow
- Refresh-token rotation, logout, and token blacklisting
- Automatic personal workspace creation
- Personal and team workspaces
- Workspace switching and document filtering
- Owner, admin, and member workspace roles
- Workspace member and role management
- Rich-text editing powered by Tiptap
- Create, view, edit, and delete documents
- Document tags, comments, and revision-history foundation
- Document attachments with media-file validation
- Search, filtering, ordering, and paginated API responses
- Idempotent document creation
- Real-time document updates over WebSockets
- Redis-backed Channels for multi-process WebSocket delivery
- Live collaborator presence
- Owner, editor, and viewer permissions
- Role-based document sharing
- Read-only access for viewers
- Responsive Next.js interface
- Django administration
- OpenAPI schema and interactive Swagger documentation
- Celery background email delivery with automatic retries
- Celery Beat scheduled invitation cleanup
- Signed, idempotent webhook ingestion
- 40 automated backend tests and coverage reporting

## Workspaces

Every user receives a personal workspace when their account is created.

Users can:

- Switch between their available workspaces
- Create additional team workspaces
- Create documents in the selected workspace
- View only the documents in the active workspace
- Add existing Zeal users to a workspace by username
- Change member roles or remove members when authorized

Workspace permissions are:

| Role | Access |
| --- | --- |
| Owner | Full workspace access, including admin appointment and member removal |
| Admin | Edit workspace documents and manage regular members |
| Member | View documents in the workspace |

Only the owner can appoint administrators. Administrators cannot manage other administrators, and a user's personal workspace cannot be deleted.

## Architecture

```text
Browser
  │
  ├── HTTP :3000 ──► Next.js frontend
  │                     │
  │                     └── /api ──► Django REST API :8000
  │
  └── WebSocket :8000 ────────────► Django Channels ──► Redis
                                           │
                         ┌─────────────────┴─────────────────┐
                         ▼                                   ▼
                    PostgreSQL 17                    Celery worker
                                                           ▲
                                                           │
                                                     Celery Beat
```

Docker Compose creates six services:

| Service | Container | Purpose | Host port |
| --- | --- | --- | --- |
| `frontend` | `zeal-frontend` | Next.js development server | `3000` |
| `backend` | `zeal-backend` | Django, REST API, and Daphne | `8000` |
| `postgres` | `zeal-postgres` | PostgreSQL database | Internal only |
| `redis` | `zeal-redis` | Channels, caching, throttling, and Celery broker | `6379` |
| `celery-worker` | `zeal-celery-worker` | Background email and webhook jobs | Internal only |
| `celery-beat` | `zeal-celery-beat` | Recurring job scheduler | Internal only |

## Technology

| Layer | Tools |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS, Tiptap |
| Backend | Python, Django, Django REST Framework, django-filter, drf-spectacular |
| Authentication | Custom Django user, groups, Simple JWT |
| Real-time transport | WebSockets served by Daphne and distributed through Redis |
| Database | PostgreSQL 17 |
| Background jobs | Celery worker and Celery Beat |
| Cache and queues | Redis 7 |
| Local infrastructure | Docker Compose and OrbStack |

## Database design

PostgreSQL is the primary data store for users, authentication, workspaces, permissions, documents, tags, revisions, comments, invitations, and audit history.

```mermaid
erDiagram
    USER ||--o{ WORKSPACE : owns
    USER ||--o{ WORKSPACE_MEMBER : joins
    WORKSPACE ||--o{ WORKSPACE_MEMBER : contains
    WORKSPACE ||--o{ DOCUMENT : contains
    USER ||--o{ DOCUMENT : owns
    DOCUMENT ||--o{ DOCUMENT_MEMBER : grants_access
    USER ||--o{ DOCUMENT_MEMBER : receives_access
    DOCUMENT }o--o{ TAG : categorized_by
    DOCUMENT ||--o{ DOCUMENT_REVISION : has_history
    DOCUMENT ||--o{ COMMENT : contains
    DOCUMENT ||--o{ DOCUMENT_ATTACHMENT : contains
    USER ||--o{ COMMENT : writes
    USER ||--o{ SOCIAL_ACCOUNT : links
    USER ||--o{ IDEMPOTENCY_RECORD : owns
    WORKSPACE ||--o{ WORKSPACE_INVITATION : issues
    WORKSPACE ||--o{ AUDIT_LOG : records
```

Important database guarantees include:

- Unique user membership within each workspace
- Valid workspace and document roles
- Unique version numbers per document
- Non-empty comment bodies
- Unique pending invitations per workspace and email
- Atomic document creation and owner-membership creation
- Idempotent document creation per user and request key
- Unique external social-provider accounts and webhook event IDs
- PostgreSQL row locking for concurrent revision numbers
- Indexed workspace document, revision, comment, and audit queries

## Quick start

### Prerequisites

Install:

- [Git](https://git-scm.com/)
- [OrbStack](https://orbstack.dev/) or another Docker Compose-compatible engine

Confirm the container engine is running:

```bash
orb status
docker context show
docker compose version
```

When using OrbStack, `docker context show` should return `orbstack`.

### 1. Clone the repository

```bash
git clone https://github.com/Arnoldshaju/Zeal.git
cd Zeal
```

### 2. Build and start Zeal

```bash
docker compose up --build
```

Compose will:

1. Start PostgreSQL and Redis and wait for their health checks.
2. Run Django database migrations.
3. Start the Django/Daphne backend.
4. Start the Celery worker and Celery Beat scheduler.
5. Start the Next.js frontend.

Open [http://localhost:3000](http://localhost:3000), register an account, select your personal workspace, and create a document.

To run in the background:

```bash
docker compose up --build -d
docker compose ps
```

## Development commands

### Logs

```bash
# All services
docker compose logs -f

# One service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
docker compose logs -f redis
docker compose logs -f celery-worker
docker compose logs -f celery-beat
```

### Django

```bash
# Configuration check
docker compose exec backend python manage.py check

# Database migrations
docker compose exec backend python manage.py migrate

# Test suite
docker compose exec backend python manage.py test

# Test coverage
docker compose exec backend coverage run manage.py test
docker compose exec backend coverage report

# Collect Django static files
docker compose exec backend python manage.py collectstatic --noinput

# Create or refresh the standard authorization groups
docker compose exec backend python manage.py seed_roles

# Django administrator
docker compose exec backend python manage.py createsuperuser
```

The administration interface is available at [http://localhost:8000/admin/](http://localhost:8000/admin/).
The Django template status page is available at [http://localhost:8000/status/](http://localhost:8000/status/).
Interactive API documentation is available at [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/).

### Frontend

```bash
# Lint
docker compose exec frontend npm run lint

# Production build check
docker compose exec frontend npm run build
```

### PostgreSQL

```bash
# Open the Zeal database
docker compose exec postgres psql -U zeal -d zeal
```

Useful commands inside `psql`:

```sql
\dt
\dt documents*
\dt workspaces*
```

Exit with:

```sql
\q
```

### Redis and background jobs

```bash
# Check Redis
docker compose exec redis redis-cli ping

# Verify a Celery round trip
docker compose exec backend python manage.py shell -c \
  'from users.tasks import celery_healthcheck; r = celery_healthcheck.delay(); print(r.get(timeout=15))'

# Inspect worker and scheduler logs
docker compose logs -f celery-worker
docker compose logs -f celery-beat
```

Redis database `0` is used by Channels, `1` by Django caching and throttling,
`2` by the Celery broker, and `3` by the Celery result backend.

### Container lifecycle

```bash
# Stop and remove containers
docker compose down

# Rebuild after dependency or Dockerfile changes
docker compose up --build -d

# Restart one service
docker compose restart backend
```

> [!WARNING]
> `docker compose down -v` also deletes the PostgreSQL volume and all data stored in it.

## Project structure

```text
Zeal/
├── apps/
│   └── web/
│       ├── Dockerfile
│       ├── public/
│       └── src/
│           ├── app/             # Pages and routes
│           ├── components/      # UI and editor components
│           └── lib/             # API and collaboration clients
├── backend/
│   ├── collaboration/           # WebSocket consumers
│   ├── config/                  # Django, Celery, API, and exception configuration
│   ├── documents/               # Documents, attachments, revisions, factories, and API
│   ├── templates/               # Django-rendered status template
│   ├── users/                   # Custom user, authentication, webhooks, tasks, and factories
│   ├── workspaces/              # Workspaces, memberships, invitations, and audit logs
│   ├── Dockerfile
│   ├── manage.py
│   └── requirements.txt
├── database/
│   ├── README.md                # Database-project guide
│   ├── er-diagram.md            # Entity relationships
│   ├── reports.sql              # Ten PostgreSQL reports
│   ├── indexing-plan.md         # Index purposes and target queries
│   ├── transactions.md          # Transaction boundaries
│   └── backup-restore.md        # Backup and restore-test instructions
├── legacy/                      # Preserved earlier frontend
├── docker-compose.yml
└── README.md
```

## API overview

### Authentication

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

The same application endpoints are also available under `/api/v1/`. The
machine-readable OpenAPI schema is served from `/api/schema/`, and Swagger UI
is served from `/api/docs/`.

New accounts must verify their email before signing in. In local development,
Django uses its console email backend, so verification and password-reset links
appear in the backend logs. When Django debug mode is enabled, the request page
also displays an **Open local reset link** button:

```bash
docker compose logs -f backend
```

To send development email through Resend:

1. Create a sending API key in Resend.
2. Copy the email settings from `backend/.env.example` into `backend/.env`.
3. Set `EMAIL_BACKEND` to Django's SMTP backend and place the Resend API key in
   `EMAIL_HOST_PASSWORD`. Do not commit `backend/.env`.
4. Use `onboarding@resend.dev` while sending to the email associated with the
   Resend account. Verify a custom domain before sending to other users.
5. Restart the backend:

```bash
docker compose restart backend
```

Access tokens expire after 15 minutes. Refresh tokens expire after seven days,
rotate when used, and are blacklisted after rotation or logout. See
[`database/token-revocation.md`](database/token-revocation.md) for the complete
strategy and [`database/permission-matrix.md`](database/permission-matrix.md)
for authorization rules.

### Workspaces

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

Create a workspace:

```json
{
  "name": "Engineering"
}
```

Add a member:

```json
{
  "username": "developer",
  "role": "MEMBER"
}
```

### Workspace documents

Filter, search, order, and paginate documents:

```text
GET /api/documents/?workspace={workspace_id}
GET /api/documents/?owner={user_id}
GET /api/documents/?search=project
GET /api/documents/?ordering=-updated_at
GET /api/documents/?page=2
```

List responses use the standard paginated shape:

```json
{
  "count": 42,
  "next": "http://localhost:8000/api/documents/?page=2",
  "previous": null,
  "results": []
}
```

Create a document in a workspace:

```json
{
  "title": "Project Plan",
  "workspace": "workspace-uuid",
  "content": {
    "type": "doc",
    "content": []
  }
}
```

The backend rejects workspace IDs belonging to workspaces the authenticated user cannot access.

To make document creation safely retryable, send an `Idempotency-Key` header:

```bash
curl -X POST http://localhost:8000/api/documents/ \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: create-project-plan-1" \
  -d '{"title":"Project Plan"}'
```

Repeating the same request with the same user, key, and body returns the
original response without creating a duplicate. Reusing the key with a
different body returns HTTP `409`.

Upload and list document attachments:

```text
POST /api/documents/{document_id}/attachments/
GET  /api/documents/{document_id}/attachments/
```

Uploads use multipart form data, require a `file` field, and are limited to
10 MB.

### Webhooks

Inbound webhook requests use:

```text
POST /api/auth/webhooks/
X-Zeal-Webhook-Secret: configured-secret
```

Each webhook contains a provider, event ID, and JSON payload. Provider/event
IDs are unique, so duplicate delivery is acknowledged without being processed
twice. New events are queued for Celery processing after the database
transaction commits.

## Database learning project

The [`database/`](database/) directory contains the PostgreSQL project deliverables:

- ER diagram
- Ten reporting queries
- Indexing plan
- Transaction-boundary explanation
- Backup and restore instructions

Run all reports against the local database:

```bash
docker compose exec -T postgres \
  psql -U zeal -d zeal < database/reports.sql
```

Create a custom-format backup:

```bash
docker compose exec postgres pg_dump \
  -U zeal -d zeal -Fc -f /tmp/zeal.dump
```

## Environment and networking

Compose configures the development environment automatically:

```text
Frontend → http://backend:8000
Backend  → postgres:5432
Backend  → redis:6379
Celery   → redis:6379
Browser  → http://localhost:3000
Browser  → ws://localhost:8000
```

Redis separates workloads across logical databases:

```text
0 → Channels/WebSocket messages
1 → Django cache and API throttle counters
2 → Celery task queue
3 → Celery task results
```

The checked-in Compose credentials are intended only for local development. Use secret management and strong unique credentials in any deployed environment.

## Troubleshooting

<details>
<summary><strong>Docker still uses Docker Desktop</strong></summary>

Start OrbStack and select its Docker context:

```bash
open -a OrbStack
docker context use orbstack
docker context show
```

</details>

<details>
<summary><strong>A port is already in use</strong></summary>

Stop any locally running Next.js or Django process, then restart Compose:

```bash
docker compose down
docker compose up --build
```

</details>

<details>
<summary><strong>Login returns 401 after resetting PostgreSQL</strong></summary>

Removing the PostgreSQL volume deletes its users. Clear stale browser authentication data and register a new account.

</details>

<details>
<summary><strong>Inspect service health and errors</strong></summary>

```bash
docker compose ps
docker compose logs backend
docker compose logs postgres
docker compose logs redis
docker compose logs celery-worker
docker compose logs celery-beat
```

</details>

## Status

Zeal currently supports custom-user authentication, workspace organization,
workspace membership management, document sharing, rich-text editing, comments,
attachments, idempotent creation, signed webhooks, Redis-backed real-time
updates, and scheduled/background tasks.

The following foundations exist but still need complete user-facing workflows:

- Invitation email delivery and token acceptance
- Revision-history API and frontend
- Automatic revision creation for WebSocket edits
- Audit-log viewer
- Tag-management interface
- Social-provider OAuth login screens and provider callback integration
- Attachment controls in the Next.js document editor
- Production-grade real-time conflict resolution

The backend currently has 40 automated tests and approximately 82% measured
coverage. Production hardening and additional editing workflows remain ongoing
work.
