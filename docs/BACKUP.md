# Backup Strategy

## Database (PostgreSQL)

### Automated daily backups (recommended)

Use your host's native backup:

- **Railway**: enable PostgreSQL automatic backups in project settings
- **AWS RDS / Cloud SQL**: configure automated snapshots (7–30 day retention)

### Manual backup

```bash
pg_dump "$DATABASE_URL" -Fc -f mango-feed-$(date +%Y%m%d).dump
```

### Restore

```bash
pg_restore -d "$DATABASE_URL" --clean --if-exists mango-feed-YYYYMMDD.dump
```

## What to back up

| Asset | Priority | Notes |
|-------|----------|-------|
| PostgreSQL database | Critical | Products, feeds, mappings, sessions, billing |
| Environment variables | Critical | Store in Railway/host secrets manager |
| Shopify app config | High | `shopify.app.toml` in git |
| Feed tokens | Medium | Regeneratable via UI |
| System logs | Low | 30-day retention by default |

## Recovery objectives

- **RPO** (Recovery Point Objective): 24 hours with daily backups
- **RTO** (Recovery Time Objective): 1–2 hours for database restore + redeploy

## Pre-migration backup

Before schema migrations in production:

```bash
pg_dump "$DATABASE_URL" -Fc -f pre-migration-backup.dump
npm run setup
```

## Uninstall data handling

Shop data is deleted on `app/uninstalled` webhook. Ensure webhook delivery is monitored via system logs.
