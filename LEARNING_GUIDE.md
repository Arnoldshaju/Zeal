# Learning Django Weeks 24–30 with Zeal

Use this cycle for every topic:

```text
Understand → locate the code → run it → modify it → test it → commit it
```

## Start every session

```bash
cd /Users/arnoldshaju/Zeal
open -a OrbStack
docker compose up -d
docker compose ps
docker compose exec backend python manage.py check
docker compose exec backend python manage.py test
```

Create a learning branch before making practice changes:

```bash
git switch main
git pull origin main
git switch -c learning/topic-name
```

## Week 24: Django fundamentals

Study:

- `backend/config/settings.py`
- `backend/config/urls.py`
- `backend/config/views.py`
- `backend/templates/status.html`
- `backend/users/management/commands/project_stats.py`

Exercises:

1. Open [http://localhost:8000/status/](http://localhost:8000/status/).
2. Change the status-page context and refresh it.
3. Clear its 30-second cache with `docker compose exec redis redis-cli -n 1 FLUSHDB`.
4. Run `docker compose exec backend python manage.py project_stats`.
5. Open the shell with `docker compose exec backend python manage.py shell`.
6. Run `python manage.py collectstatic --noinput` inside the backend container.

You should be able to explain projects, apps, settings, URLs, views, templates,
models, migrations, admin, static files, media files, the shell, and management
commands.

## Week 25: Models and ORM

Study:

- `backend/documents/models.py`
- `backend/workspaces/models.py`
- `backend/documents/services.py`
- `backend/documents/views.py`

Try these queries in the Django shell:

```python
from django.contrib.auth import get_user_model
from documents.models import Document

user = get_user_model().objects.first()
Document.objects.all()
Document.objects.owned_by(user)
Document.objects.recently_updated()
Document.objects.filter(title__icontains="project")
print(Document.objects.owned_by(user).query)
```

Exercise: add a `containing_title(text)` QuerySet method, expose it through the
manager, and write a test.

Learn why Zeal uses:

- Foreign keys and many-to-many relationships
- Constraints and indexes
- `transaction.atomic()`
- `select_for_update()`
- `select_related()` and `prefetch_related()`
- Aggregations and annotations

## Week 26: Django REST Framework

Study:

- `backend/documents/serializers.py`
- `backend/documents/views.py`
- `backend/documents/urls.py`
- `backend/config/exceptions.py`

Open [Swagger UI](http://localhost:8000/api/docs/) and test:

```text
POST /api/auth/login/
GET  /api/documents/
POST /api/documents/
PATCH /api/documents/{id}/
```

Try:

```text
/api/documents/?search=project
/api/documents/?ordering=title
/api/documents/?ordering=-updated_at
/api/documents/?page=2
```

Trace the complete flow:

```text
URL → router → ViewSet → authentication → permission
    → QuerySet → serializer → PostgreSQL → JSON response
```

## Week 27: Authentication and authorization

Study:

- `backend/users/models.py`
- `backend/users/serializers.py`
- `backend/users/views.py`
- `backend/documents/permissions.py`
- `backend/users/tests.py`

Create and inspect the standard groups:

```bash
docker compose exec backend python manage.py seed_roles
docker compose exec backend python manage.py shell
```

```python
from django.contrib.auth.models import Group
Group.objects.all()
Group.objects.get(name="Zeal Editors").permissions.all()
```

Manual permission exercise:

1. Register two users.
2. Create a document as the first user.
3. Add the second user as `VIEWER`.
4. Confirm the viewer can read but cannot edit.
5. Change the role to `EDITOR`.
6. Confirm editing now works.

Trace access tokens, refresh tokens, rotation, blacklisting, email verification,
password reset, object permissions, groups, and the `SocialAccount` model.

## Week 28: API design

Study:

- `/api/` and `/api/v1/` routes
- Pagination and validation responses
- PATCH semantics
- Throttling
- OpenAPI
- Uploads
- Idempotency

Test document idempotency:

```bash
curl -X POST http://localhost:8000/api/documents/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: learning-document-1" \
  -d '{"title":"Created once"}'
```

Run the same request again. Only one document should exist. Change the body
while keeping the key and confirm that the API returns HTTP `409`.

Test an upload:

```bash
curl -X POST \
  http://localhost:8000/api/documents/DOCUMENT_ID/attachments/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/absolute/path/to/example.txt"
```

Exercise: allow only `.txt`, `.pdf`, `.png`, and `.jpg`, then test one accepted
and one rejected extension.

## Week 29: Testing

Test locations:

- `backend/config/tests.py`
- `backend/documents/tests.py`
- `backend/users/tests.py`
- `backend/workspaces/tests.py`
- `backend/collaboration/tests.py`

Commands:

```bash
docker compose exec backend python manage.py test
docker compose exec backend python manage.py test documents.tests
docker compose exec backend coverage erase
docker compose exec backend coverage run manage.py test
docker compose exec backend coverage report
```

Identify unit, integration, API, permission, factory, mock, failure, duplicate,
and concurrency tests. Deliberately break one implementation, confirm its test
fails, then restore it.

Practice by testing:

- An upload larger than 10 MB
- An invalid webhook secret
- An idempotency key reused with different data
- A duplicate social-provider account
- Expired invitation cleanup

## Week 30: Background jobs and caching

Study:

- `backend/config/celery.py`
- `backend/config/settings.py`
- `backend/users/tasks.py`
- `backend/users/webhooks.py`
- `backend/workspaces/tasks.py`
- `docker-compose.yml`

Check Redis:

```bash
docker compose exec redis redis-cli ping
docker compose exec redis redis-cli -n 0 DBSIZE
docker compose exec redis redis-cli -n 1 DBSIZE
docker compose exec redis redis-cli -n 2 DBSIZE
docker compose exec redis redis-cli -n 3 DBSIZE
```

Test a Celery round trip:

```bash
docker compose exec backend python manage.py shell
```

```python
from users.tasks import celery_healthcheck
result = celery_healthcheck.delay()
result.get(timeout=15)
```

Study email retries, the scheduled expired-invitation cleanup, and the signed
webhook flow:

```text
External service → Django → PostgreSQL → Redis → Celery worker
Celery Beat → Redis → Celery worker → PostgreSQL
```

Watch jobs:

```bash
docker compose logs -f celery-worker celery-beat
```

## Daily study routine

Use a 90-minute session:

1. Read one feature for 20 minutes.
2. Trace its request flow for 20 minutes.
3. Modify or extend it for 30 minutes.
4. Write and run a test for 15 minutes.
5. Record what you learned for 5 minutes.

Use this note format:

```text
Topic:
Problem it solves:
Zeal files involved:
Request-to-response flow:
Database/Redis data involved:
How I tested it:
What failed and why:
```

## Commit each exercise

```bash
git status
git add ACTUAL_FILE_PATHS_FROM_GIT_STATUS
git commit -m "Practise document title filtering"
git push -u origin learning/topic-name
```

Do not type placeholder paths such as `path/to/file`. The goal is to trace a
feature from the browser through Next.js and Django into PostgreSQL or Redis,
and back to the user.
