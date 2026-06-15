# Render production setup

## Required environment variables

In **Render Dashboard → mango-product-feed → Environment**, set:

| Variable | Value |
|----------|--------|
| `SHOPIFY_API_SECRET` | From Shopify Partners → App → Client credentials |
| `DATABASE_URL` | From linked PostgreSQL service (Internal URL) |
| `SHOPIFY_API_KEY` | Set automatically from `render.yaml` |
| `APP_URL` | `https://mango-product-feed.onrender.com` |
| `SHOPIFY_APP_URL` | `https://mango-product-feed.onrender.com` |

`SHOPIFY_API_SECRET` is **not** stored in git. Add it manually in Render.

## Deploy

1. Push to GitHub (`main` branch)
2. Render auto-deploys, or click **Manual Deploy**
3. Start command: `npm run render-start`
4. Verify: `https://mango-product-feed.onrender.com/health`

## Install app

Open the app from Shopify Admin (embedded). Do not expect `/app` to work when opened directly in a browser tab without Shopify session context.
