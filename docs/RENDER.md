# Render production setup

## Render Dashboard settings

**Web service → Settings**

| Setting | Value |
|---------|--------|
| **Region** | Singapore (same as your PostgreSQL) |
| **Build Command** | `npm ci --include=dev && npx prisma generate && npm run build` |
| **Start Command** | `npm run render-start` |
| **Health Check Path** | `/health` |

## Environment variables

Set in **Render Dashboard → mango-product-feed → Environment**:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | `postgresql://USER:PASS@HOST/DB?sslmode=require` |
| `SHOPIFY_API_SECRET` | From Shopify Partners → Client credentials |
| `SHOPIFY_API_KEY` | `133b57713a5ec35408555486ad242555` |
| `SHOPIFY_APP_URL` | `https://mango-product-feed.onrender.com` |
| `APP_URL` | `https://mango-product-feed.onrender.com` |
| `NODE_ENV` | `production` |
| `SCOPES` | `read_products,write_products,read_inventory,read_content` |

**Important:** External Render Postgres URLs **must** end with `?sslmode=require`.

Use the **Internal Database URL** if your web service and database are both on Render (recommended).

Secrets are **never** committed to git (`sync: false` in `render.yaml`).

## Deploy

1. Push to GitHub `main` (triggers auto-deploy if connected)
2. Or **Manual Deploy → Deploy latest commit** in Render
3. Watch **Logs** for `[startup] Production environment check passed.`

## Verify

```bash
curl https://mango-product-feed.onrender.com/health
curl -I https://mango-product-feed.onrender.com/
```

- `/health` → 200
- `/` → 200 (not 500)
- `/app` → open from **Shopify Admin**, not a direct browser tab

## Install app

Apps → Mango Product Feed in Shopify Admin (embedded OAuth).
