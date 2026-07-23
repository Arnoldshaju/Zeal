# Zeal

> A collaborative document editor built with Next.js, Django, PostgreSQL, and WebSockets.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Django](https://img.shields.io/badge/Django-4.2-0C4B33?logo=django)](https://www.djangoproject.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)

Zeal lets people create, edit, and share rich-text documents while receiving live updates through WebSockets. The full development stack runs in containers and works with OrbStack or any Docker Compose-compatible engine.

> [!NOTE]
> Zeal is under active development. Features and APIs may change.

## Highlights

- User registration and JWT-based authentication
- Automatic access-token renewal
- Rich-text editing powered by Tiptap
- Create, view, edit, and delete documents
- Real-time document updates over WebSockets
- Live collaborator presence
- Owner, editor, and viewer permissions
- Role-based document sharing
- Read-only access for viewers
- Responsive Next.js interface
- Django administration
- Automated backend tests

## Architecture

```text
Browser
  │
  ├── HTTP :3000 ──► Next.js frontend
  │                     │
  │                     └── /api ──► Django REST API :8000
  │
  └── WebSocket :8000 ────────────► Django Channels
                                           │
                                           ▼
                                      PostgreSQL 17
```

Docker Compose creates three services:

| Service | Container | Purpose | Host port |
| --- | --- | --- | --- |
| `frontend` | `zeal-frontend` | Next.js development server | `3000` |
| `backend` | `zeal-backend` | Django, REST API, and Daphne | `8000` |
| `postgres` | `zeal-postgres` | PostgreSQL database | Internal only |

## Technology

| Layer | Tools |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS, Tiptap |
| Backend | Python, Django, Django REST Framework, Django Channels |
| Authentication | Simple JWT |
| Real-time transport | WebSockets served by Daphne |
| Database | PostgreSQL 17 |
| Local infrastructure | Docker Compose and OrbStack |

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

1. Start PostgreSQL and wait for its health check.
2. Run Django database migrations.
3. Start the Django/Daphne backend.
4. Start the Next.js frontend.

Open [http://localhost:3000](http://localhost:3000), register an account, and create a document.

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
```

### Django

```bash
# Configuration check
docker compose exec backend python manage.py check

# Database migrations
docker compose exec backend python manage.py migrate

# Test suite
docker compose exec backend python manage.py test

# Django administrator
docker compose exec backend python manage.py createsuperuser
```

The administration interface is available at [http://localhost:8000/admin/](http://localhost:8000/admin/).

### Frontend

```bash
# Lint
docker compose exec frontend npm run lint

# Production build check
docker compose exec frontend npm run build
```

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
│   ├── config/                  # Django configuration
│   ├── documents/               # Document models and API
│   ├── users/                   # Authentication and users
│   ├── Dockerfile
│   ├── manage.py
│   └── requirements.txt
├── legacy/                      # Preserved earlier frontend
├── docker-compose.yml
└── README.md
```

## Environment and networking

Compose configures the development environment automatically:

```text
Frontend → http://backend:8000
Backend  → postgres:5432
Browser  → http://localhost:3000
Browser  → ws://localhost:8000
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
```

</details>

## Status

Zeal currently supports its core document and collaboration workflows. Production hardening, broader automated coverage, and additional editing features remain ongoing work.
