# Zeal database project

This directory documents the PostgreSQL design introduced by the database
learning project.

- `er-diagram.md`: entity relationships
- `reports.sql`: ten reporting queries
- `indexing-plan.md`: indexes and their target queries
- `transactions.md`: atomic operation boundaries
- `backup-restore.md`: safe backup and restore-test procedure

Run reports after all project migrations are applied:

```bash
docker compose exec -T postgres psql -U zeal -d zeal < database/reports.sql
```
