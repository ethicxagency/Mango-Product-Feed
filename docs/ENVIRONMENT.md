# Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `APP_URL` | Yes | Public app URL (no trailing slash) |
| `NODE_ENV` | Prod | `production` in deployed environments |
| `SHOPIFY_API_KEY` | Shopify | App API key from Partner Dashboard |
| `SHOPIFY_API_SECRET` | Shopify | App API secret |
| `SHOPIFY_APP_URL` | Shopify | Same as public app URL |
| `SCOPES` | Shopify | OAuth scopes (comma-separated) |
| `LOCAL_SHOP_ID` | Local | Standalone shop ID (`local-shop`) |
| `ADMIN_EMAIL` | Admin | Default admin user email |
| `ADMIN_PASSWORD` | Admin | Default admin password (**change in prod**) |
| `OPENAI_API_KEY` | AI | Enables real AI optimization |
| `OPENAI_MODEL` | AI | Model name (default: `gpt-4o-mini`) |
| `SMTP_HOST` | Email | SMTP server hostname |
| `SMTP_PORT` | Email | SMTP port (587 or 465) |
| `SMTP_USER` | Email | SMTP username |
| `SMTP_PASS` | Email | SMTP password |
| `SMTP_FROM` | Email | From address for alerts |
| `RATE_LIMIT_PER_MINUTE` | Security | Global rate limit (default: 120) |

## Example `.env` (local)

```env
DATABASE_URL="postgresql://mango:mango@localhost:5432/mango_feed"
APP_URL="http://localhost:3000"
SHOPIFY_API_KEY=""
SHOPIFY_API_SECRET=""
SHOPIFY_APP_URL="http://localhost:3000"
ADMIN_EMAIL="admin@mango-feed.app"
ADMIN_PASSWORD="changeme"
```

## Example `.env` (Railway production)

```env
DATABASE_URL="${{Postgres.DATABASE_URL}}"
APP_URL="https://mango-feed.up.railway.app"
SHOPIFY_APP_URL="https://mango-feed.up.railway.app"
NODE_ENV="production"
ADMIN_EMAIL="ops@yourcompany.com"
ADMIN_PASSWORD="<strong-random-password>"
SMTP_HOST="smtp.sendgrid.net"
SMTP_USER="apikey"
SMTP_PASS="<sendgrid-api-key>"
SMTP_FROM="noreply@yourcompany.com"
OPENAI_API_KEY="sk-..."
```
