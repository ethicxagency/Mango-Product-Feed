# Deployment Guide

## Prerequisites

- Node.js 20.19+ or 22.12+
- PostgreSQL 16+
- Shopify Partner account (for embedded app)
- Domain with HTTPS (production)

## Local development

### 1. Start PostgreSQL

```bash
docker compose up postgres -d
```

### 2. Configure environment

```bash
cp .env.example .env
# Set DATABASE_URL=postgresql://mango:mango@localhost:5432/mango_feed
```

### 3. Install and migrate

```bash
npm install
npm run setup
```

### 4. Run

```bash
# Standalone (no Shopify credentials)
npm run dev:local

# Shopify embedded
npm run dev
```

App: http://localhost:3000  
Admin: http://localhost:3000/admin/login

## Docker production

```bash
docker compose up --build
```

This starts PostgreSQL + the app on port 3000.

## Railway deployment

1. Create a Railway project
2. Add a **PostgreSQL** plugin
3. Connect your GitHub repo
4. Set environment variables (see `docs/ENVIRONMENT.md`)
5. Railway uses `railway.json` for build/deploy config
6. Verify health: `GET /health`

### Required Railway variables

- `DATABASE_URL` (from PostgreSQL plugin)
- `APP_URL` (your Railway public URL)
- `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` (change defaults!)
- `SMTP_*` for email alerts (optional)
- `OPENAI_API_KEY` for AI features (optional)

## Shopify App Store deploy

```bash
npm run config:link
npm run deploy
```

Configure app URLs in Partner Dashboard:

- App URL: `https://your-domain.com/app`
- Privacy policy: `https://your-domain.com/privacy`
- Terms: `https://your-domain.com/terms`
- Support: `https://your-domain.com/support`

## Post-deploy checklist

- [ ] Migrations applied (`npm run setup`)
- [ ] Health check returns 200
- [ ] OAuth install flow works on a dev store
- [ ] Feed URLs return valid XML
- [ ] Admin password changed from default
- [ ] SMTP configured for alerts
- [ ] Backup strategy configured (see `docs/BACKUP.md`)
