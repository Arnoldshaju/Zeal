# Backup and restore

Create a custom-format backup inside the PostgreSQL container:

```bash
docker compose exec postgres pg_dump \
  -U zeal -d zeal -Fc -f /tmp/zeal.dump
```

Create a separate restore-test database:

```bash
docker compose exec postgres createdb -U zeal zeal_restore
docker compose exec postgres pg_restore \
  -U zeal -d zeal_restore --clean --if-exists /tmp/zeal.dump
```

Never restore a practice backup over the active `zeal` database. A backup is
considered verified only after a successful restore and basic data checks.
