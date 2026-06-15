# Shopify App Store Readiness Checklist

## Required pages (implemented)

- [x] Privacy Policy — `/privacy`
- [x] Terms of Service — `/terms`
- [x] Support page — `/support`

## Billing compliance

- [x] Shopify Billing API integration (`billing.server.ts`)
- [x] Free / Starter / Pro plans
- [x] Subscription records in database
- [ ] Verify charge confirmation flow on dev store before submission
- [ ] Document pricing clearly in app listing

## App listing assets (prepare manually)

| Asset | Spec |
|-------|------|
| App icon | 1200×1200 PNG, no transparency |
| Feature media | 1600×900 screenshots (dashboard, feeds, health, AI) |
| App name | Mango Product Feed |
| Tagline | Multi-channel product feeds for Shopify |
| Primary category | Marketing > Advertising |
| Support email | support@mango-feed.app |
| Privacy policy URL | `https://your-domain.com/privacy` |
| Terms URL | Optional but recommended |

## Technical requirements

- [x] OAuth install/uninstall webhooks
- [x] Product sync webhooks (create/update/delete)
- [x] Embedded app with App Bridge
- [x] GDPR: data deleted on uninstall webhook
- [x] HTTPS in production
- [x] Session storage in PostgreSQL
- [ ] Run Shopify app review pre-check: `shopify app deploy`

## Security review

- [x] Webhook HMAC validation
- [x] Rate limiting on public endpoints
- [x] Security headers (CSP, X-Frame-Options)
- [x] Input validation (Zod)
- [x] Admin panel with separate auth
- [ ] Rotate default admin password before launch
- [ ] Enable `requireSecretTokens` for production feeds

## Functional testing matrix

| Feature | Test |
|---------|------|
| Install on dev store | OAuth completes, default feeds created |
| Product sync | Manual + webhook sync updates catalog |
| Google feed | `/feed/google.xml?token=...` valid XML |
| Meta/TikTok/Pinterest/Snapchat | Each channel returns XML |
| Custom XML | Template placeholders render correctly |
| Category mapping | Mapped categories appear in feed |
| Currency conversion | Prices converted to feed currency |
| Country filter | Only matching country products included |
| Feed health | Score and issues display correctly |
| AI optimization | Works with API key; fallback without |
| Email alerts | Feed error triggers notification |
| Billing upgrade | Starter/Pro charge accepted in Shopify |
| Uninstall | Shop data cleaned up |

## Submission notes

1. Provide test store credentials to Shopify review team
2. Include sample feed URLs with valid tokens
3. Explain AI feature processes product text via OpenAI (disclose in privacy policy)
4. List all requested OAuth scopes with justification:
   - `read_products` / `write_products` — sync catalog
   - `read_inventory` — stock availability in feeds
   - `read_content` — product descriptions

## Post-approval

- Monitor system logs for feed errors
- Set up SMTP for merchant alert emails
- Configure Railway/production backups
- Plan Redis rate limiter before high traffic
