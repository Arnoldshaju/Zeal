
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Django](https://img.shields.io/badge/Django-4.2-0C4B33?logo=django)](https://www.djangoproject.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Celery](https://img.shields.io/badge/Celery-5-37814A?logo=celery&logoColor=white)](https://docs.celeryq.dev/)
[![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)

Zeal lets people organize documents into personal or team workspaces, manage member permissions, edit rich-text content, and receive live updates through WebSockets. The full development stack runs in containers and works with OrbStack or any Docker Compose-compatible engine.
## Highlights

- User registration and JWT-based authentication
- Custom Django user model and reusable Django authorization groups
- Automatic access-token renewal
- Email verification for new accounts
- Password-reset request and confirmation flow
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
- Automated backend tests
- OpenAPI schema and interactive Swagger documentation
- Celery background email delivery with automatic retries
- Celery Beat scheduled invitation cleanup
- Signed, idempotent webhook ingestion
- 40 automated backend tests and coverage reporting

## Workspaces

Every user receives a personal workspace when their account is created. Existing users and documents are also migrated automatically: each existing user receives a personal workspace, and their documents are assigned to it.
Every user receives a personal workspace when their account is created.

Users can:

  │                     │
  │                     └── /api ──► Django REST API :8000
  │
  └── WebSocket :8000 ────────────► Django Channels
  └── WebSocket :8000 ────────────► Django Channels ──► Redis
                                           │
                                           ▼
                                      PostgreSQL 17
                         ┌─────────────────┴─────────────────┐
                         ▼                                   ▼
                    PostgreSQL 17                    Celery worker
                                                           ▲
                                                           │
                                                     Celery Beat
```

Docker Compose creates three services:
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
| Backend | Python, Django, Django REST Framework, Django Channels |
| Authentication | Simple JWT |
| Real-time transport | WebSockets served by Daphne |
| Backend | Python, Django, Django REST Framework, django-filter, drf-spectacular |
| Authentication | Custom Django user, groups, Simple JWT |
| Real-time transport | WebSockets served by Daphne and distributed through Redis |
| Database | PostgreSQL 17 |
| Background jobs | Celery worker and Celery Beat |
| Cache and queues | Redis 7 |
| Local infrastructure | Docker Compose and OrbStack |

## Database design
    DOCUMENT }o--o{ TAG : categorized_by
    DOCUMENT ||--o{ DOCUMENT_REVISION : has_history
    DOCUMENT ||--o{ COMMENT : contains
    DOCUMENT ||--o{ DOCUMENT_ATTACHMENT : contains
    USER ||--o{ COMMENT : writes
    USER ||--o{ SOCIAL_ACCOUNT : links
    USER ||--o{ IDEMPOTENCY_RECORD : owns
    WORKSPACE ||--o{ WORKSPACE_INVITATION : issues
