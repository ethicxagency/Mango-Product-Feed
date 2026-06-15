# Mango Product Feed

A localhost-first product feed generator for **Google Shopping**, **Meta Catalog**, and **TikTok Catalog**. Manage products in SQLite, preview XML feeds, and publish public feed URLs — no Shopify or external APIs required.

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser (Shopify Polaris UI)                │
│  Dashboard │ Products CRUD │ Feed Generator & Preview           │
└────────────────────────────┬────────────────────────────────────┘
                             │ React Router loaders/actions
┌────────────────────────────▼────────────────────────────────────┐
│                    Remix / React Router Server                  │
│  routes/          UI pages + XML resource routes                  │
│  services/        Product, FeedGenerator, FeedHealth, Requests    │
│  utils/           XML escaping, validation, URL helpers           │
└────────────────────────────┬────────────────────────────────────┘
                             │ Prisma ORM
┌────────────────────────────▼────────────────────────────────────┐
│                     SQLite (prisma/dev.sqlite)                  │
│  products         Local product catalog                           │
│  feed_requests    Feed generation/access audit log                │
└─────────────────────────────────────────────────────────────────┘

Public XML endpoints (no auth):
  GET /feed/google.xml
  GET /feed/meta.xml
  GET /feed/tiktok.xml
```

### Layers

| Layer | Responsibility |
|-------|----------------|
| **Presentation** | Polaris UI, dashboard metrics, product forms, feed preview modal |
| **Application** | React Router loaders/actions for CRUD and page data |
| **Domain services** | Feed XML generation, health scoring, request logging |
| **Data** | Prisma models backed by SQLite |

## 2. Folder Structure

```
mango-product-feed/
├── app/
│   ├── components/
│   │   ├── AppLayout.tsx           # Polaris Frame + navigation
│   │   ├── HealthIssuesList.tsx    # Feed health table
│   │   └── ProductForm.tsx         # Shared create/edit form
│   ├── routes/
│   │   ├── _index.tsx              # Dashboard
│   │   ├── products._index.tsx     # Product list + delete
│   │   ├── products.new.tsx        # Create product
│   │   ├── products.$id.edit.tsx   # Edit product
│   │   ├── feeds._index.tsx        # Feed generator + preview
│   │   ├── feed.google[.]xml.tsx   # Google Shopping XML
│   │   ├── feed.meta[.]xml.tsx     # Meta Catalog XML
│   │   └── feed.tiktok[.]xml.tsx   # TikTok Catalog XML
│   ├── services/
│   │   ├── product.server.ts       # Product CRUD
│   │   ├── feed-generator.server.ts# XML builder + generation
│   │   ├── feed-health.server.ts   # Health checker + score
│   │   └── feed-request.server.ts  # Request logging + stats
│   ├── types/
│   │   └── product.ts              # Shared types and constants
│   ├── utils/
│   │   └── product.ts              # Validation + XML helpers
│   ├── db.server.ts                # Prisma singleton
│   ├── entry.server.tsx
│   ├── root.tsx
│   └── routes.ts
├── prisma/
│   ├── schema.prisma               # Database schema
│   ├── seed.ts                     # Sample mango products
│   └── migrations/
├── .env.example
├── package.json
├── vite.config.ts
└── README.md
```

## 3. Database Schema

### Product

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | Primary key |
| title | String | Product title |
| description | String | Full description |
| sku | String | Unique SKU |
| brand | String | Brand name |
| category | String | Google product category |
| product_type | String | Merchant product type |
| price | Decimal | Regular price |
| sale_price | Decimal? | Optional sale price |
| availability | Enum | IN_STOCK, OUT_OF_STOCK, PREORDER |
| image_url | String | Product image URL |
| product_url | String | Landing page URL |

### FeedRequest

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | Primary key |
| feed_type | Enum | GOOGLE, META, TIKTOK |
| status | Enum | SUCCESS, ERROR |
| product_count | Int | Products included in feed |
| error_message | String? | Error detail if failed |
| created_at | DateTime | Request timestamp |

## 4. Local Setup Guide

### Prerequisites

- Node.js 20.19+ or 22.12+
- npm

### Setup Commands

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Generate Prisma client, run migrations, seed sample data
npm run setup

# 4. Start development server
npm run dev
```

Open **http://localhost:3000**

### Additional Commands

```bash
npm run db:migrate    # Create/apply migrations in dev
npm run db:seed       # Re-seed sample products
npm run db:reset      # Reset database and re-seed
npm run build         # Production build
npm run start         # Run production server
npm run typecheck     # TypeScript check
```

## 5. Prisma Models

See `prisma/schema.prisma` for the full definition. Key models:

- **Product** — local catalog with all feed-required fields
- **FeedRequest** — audit trail each time a public feed is generated

## 6. Backend APIs

React Router server routes (loaders/actions):

| Route | Method | Purpose |
|-------|--------|---------|
| `/` | GET | Dashboard stats + health report |
| `/products` | GET | List products |
| `/products` | POST | Delete product (`intent=delete`) |
| `/products/new` | POST | Create product |
| `/products/:id/edit` | GET/POST | Load/edit product |
| `/feeds` | GET | Feed URLs, previews, health |
| `/feed/google.xml` | GET | Google Shopping XML |
| `/feed/meta.xml` | GET | Meta Catalog XML |
| `/feed/tiktok.xml` | GET | TikTok Catalog XML |

## 7. Frontend Pages

| Page | URL | Features |
|------|-----|----------|
| Dashboard | `/` | Total products, feeds, requests, health score |
| Products | `/products` | Index table, edit, delete |
| Add Product | `/products/new` | Create form |
| Edit Product | `/products/:id/edit` | Update form |
| Feed Generator | `/feeds` | Feed URLs, copy, XML preview modal |

## 8. XML Generator Service

`app/services/feed-generator.server.ts`:

- Builds RSS 2.0 XML with Google namespace (`xmlns:g`)
- Maps availability to platform values (`in stock`, `out of stock`, `preorder`)
- Includes price, sale price, brand, category, product type, image, and link
- Logs each public feed request to `feed_requests`

### Feed Health Checker

`app/services/feed-health.server.ts` detects:

- Missing image URL
- Missing SKU
- Missing brand
- Missing or zero price
- Missing product URL

Health score = `(healthy products / total products) × 100`

## Tech Stack

- **Frontend:** React, React Router v7 (Remix architecture), TypeScript, Shopify Polaris
- **Backend:** Node.js, React Router server loaders/actions
- **Database:** SQLite + Prisma ORM

## 9. Shopify Embedded App Integration

The app extends into a Shopify embedded app without removing standalone localhost mode.

### Setup

```bash
# Standalone localhost (no Shopify)
npm run dev:local

# Shopify embedded app
npm run config:link
npm run dev
```

Add to `.env`:

```bash
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SCOPES=read_products,write_products,read_inventory,read_content
SHOPIFY_APP_URL=
```

### Deliverables

| # | Feature | Files |
|---|---------|-------|
| 1 | Shopify setup | `shopify.app.toml`, `shopify.web.toml`, `app/shopify.server.ts` |
| 2 | OAuth flow | `app/routes/auth.*`, Prisma `Session` model |
| 3 | Webhooks | `app/routes/webhooks.*` |
| 4 | Product sync | `app/services/shopify-sync.server.ts`, `/app/sync` |
| 5 | Billing | `app/services/billing.server.ts`, `/app/billing` |
| 6 | Database | `Shop`, `Session`, `Subscription` models + migration |

### Embedded routes (`/app/*`)

- Dashboard, products, feeds, builder, analytics, logs, health, settings, sync, billing
- App Bridge navigation via `EmbeddedAppLayout`

### Sync modes

- **Initial sync** — runs on OAuth `afterAuth`
- **Manual sync** — `/app/sync`
- **Automatic sync** — webhooks when sync mode is `AUTOMATIC`

### Billing plans

- **Free** — basic feeds
- **Starter** — $9.99/mo
- **Pro** — $29.99/mo

Feed URLs remain unchanged and are scoped per shop via feed tokens.

## Production-ready extensions

### Feed channels

| Channel | URL |
|---------|-----|
| Google Shopping | `/feed/google.xml` |
| Meta Catalog | `/feed/meta.xml` |
| TikTok Catalog | `/feed/tiktok.xml` |
| Pinterest Catalog | `/feed/pinterest.xml` |
| Snapchat Catalog | `/feed/snapchat.xml` |
| Custom XML | `/feed/custom.xml` |

### Advanced features

- Category mapping — `/feeds/mappings`
- Currency conversion — per-feed `currencyCode`
- Country-specific feeds — per-feed `targetCountry`
- Product exclusion rules — shop-level via `ProductExclusion` model
- Feed templates — `FeedTemplate` model + custom XML placeholders

### AI features

- `/ai` — title optimization, description optimization, feed health suggestions
- Set `OPENAI_API_KEY` for live AI; falls back to local suggestions

### Admin panel

- `/admin/login` — user/store/subscription management, system logs
- Default credentials from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (change in production)

### Legal pages (App Store)

- `/privacy`, `/terms`, `/support`

### Deployment

- **PostgreSQL** — required (`DATABASE_URL`)
- **Docker** — `docker compose up --build`
- **Railway** — `railway.json` + PostgreSQL plugin
- **Docs** — see `docs/` for deployment, env vars, backup, scaling, App Store checklist

```bash
docker compose up postgres -d
cp .env.example .env
npm run setup
npm run dev:local
```

## License

MIT
