# Scaling Strategy

## Current architecture limits

- Single Node.js process via `react-router-serve`
- In-memory rate limiting (per instance)
- Streaming XML generation (memory-efficient for 100k+ products)
- PostgreSQL connection pool via Prisma

## Vertical scaling (first step)

1. Increase Railway/host memory to 1–2 GB
2. Tune Prisma pool: add `?connection_limit=10` to `DATABASE_URL`
3. Increase `streamingBatchSize` in Settings (default 500)

## Horizontal scaling

For multiple app instances:

1. **Replace in-memory rate limiter** with Redis (`ioredis`)
2. **Use managed PostgreSQL** with connection pooling (PgBouncer / Supabase pooler)
3. **Sticky sessions not required** — Shopify sessions in PostgreSQL
4. **Feed endpoints are stateless** — safe to load balance

## Feed performance

| Products | Strategy |
|----------|----------|
| < 10k | Default streaming batch (500) |
| 10k–100k | Batch size 1000, CDN cache on feed URLs |
| 100k+ | Consider pre-generated feeds to object storage (S3/R2) on schedule |

## Database indexing

Existing indexes cover:

- `products.shopId`, `category`, `brand`, `countryCode`
- `feed_configs.shopId`, `feedType`
- `feed_logs.createdAt`
- `system_logs.level`, `category`

Monitor slow queries and add composite indexes if analytics queries degrade.

## Background jobs (future)

Move to a job queue for:

- Scheduled feed regeneration
- Expiry notification checks (`checkExpiringFeeds`)
- Bulk AI optimization
- Log purging (`purgeOldSystemLogs`)

Recommended: BullMQ + Redis or Railway cron hitting internal endpoints.

## CDN for public feeds

Place Cloudflare or Fastly in front of feed URLs:

- Cache `/feed/*.xml` for 5–15 minutes
- Bypass cache when `requireSecretTokens` is enabled (token in query string)

## Monitoring

- Health: `GET /health`
- Error logs: Admin panel → System Logs
- Railway metrics: CPU, memory, response time
- Optional: Sentry for exception tracking
