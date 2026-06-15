# Production Architecture

## Overview

Mango Product Feed is a dual-mode Shopify app:

- **Embedded mode** (`/app/*`) — OAuth, App Bridge, billing, Shopify product sync
- **Standalone mode** — local development with `LOCAL_SHOP_ID`
- **Public feeds** — tokenized XML endpoints for ad platforms

## Components

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Shopify Admin  │────▶│  React Router 7  │────▶│   PostgreSQL    │
│  (App Bridge)   │     │  + Polaris UI    │     │   (Prisma ORM)  │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              Feed Stream   AI Service   Notifications
              (XML)         (OpenAI)     (SMTP)
                    │
                    ▼
         Google / Meta / TikTok / Pinterest / Snapchat / Custom
```

## Data model highlights

| Model | Purpose |
|-------|---------|
| `Shop` | Multi-tenant store record |
| `Product` | Synced/manual catalog with currency & country |
| `FeedConfig` | Named feeds with filters, rules, currency, country, expiry |
| `CategoryMapping` | Platform-specific taxonomy mapping |
| `ProductExclusion` | Shop-level exclusion rules |
| `FeedTemplate` | Custom XML item templates |
| `AdminUser` | Super-admin panel authentication |
| `NotificationPreference` | Email alert configuration |
| `SystemLog` | Operational audit trail |
| `AiOptimization` | AI suggestion history |

## Request flow (feed generation)

1. Public request hits `/feed/{channel}.xml?token=...`
2. Rate limiter validates request volume
3. `FeedConfig` resolved by token + channel
4. Products filtered by shop, country, filters, exclusions, rules
5. Category mapping + currency conversion applied
6. XML streamed in batches (100k+ capable)
7. Access logged; errors trigger email notifications

## Security layers

- Shopify OAuth for embedded routes
- Webhook HMAC verification
- Admin session cookies (HttpOnly)
- Rate limiting on feeds and auth endpoints
- CSP / XSS headers on HTML responses
- Zod input validation on forms

## Deployment targets

- **Docker** — multi-stage build with health check
- **Railway** — `railway.json` with `/health` probe
- **Shopify App Store** — `shopify app deploy`
