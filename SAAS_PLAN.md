# POSQ → Multi-Restaurant SaaS: Full Plan

Turning POSQ into a SaaS where you (super admin) onboard restaurants, they pay a
monthly Stripe subscription, and each gets an automatic subdomain
(`{slug}.mybrand.com`) with its own QR menu, admin, stock management, and a
phone-based customer loyalty program.

---

## 0. Decisions needed before work starts

| # | Decision | Recommendation |
|---|---|---|
| 1 | **Stripe availability.** The app uses MAD, implying Morocco. Stripe does not onboard Moroccan businesses directly. | Pick one: (a) register a company in a Stripe-supported country (US LLC via Stripe Atlas, EU/UK entity); (b) use a merchant of record (Paddle, Lemon Squeezy); (c) use a local gateway (CMI). Plan assumes (a) but keeps billing behind one interface so it's swappable. |
| 2 | Brand domain | Replace `mybrand.com` below with your real domain (Cloudflare DNS recommended). |
| 3 | Customer identity scope | **Per restaurant.** Same phone number at two restaurants = two separate customer records and point balances. |
| 4 | Phone verification | SMS/WhatsApp OTP (Twilio or Infobip — WhatsApp is cheaper in Morocco). Without it, anyone can spend someone else's points. |
| 5 | Database | Production = **MySQL only**. Drop SQLite and the runtime "switch DB from Settings" feature — incompatible with shared SaaS hosting. |
| 6 | Pricing | Base monthly price, trial length (suggest 14 days), grace period after failed payment (suggest 7 days). |

---

## Phase 1 — Cleanup (≈1 week)

Fix the audit findings first; they'd undermine a SaaS launch:

- Remove `.env`, `server/.env*`, `RESTAURANT_CREDENTIALS.md`, `server/data/*.db`, and log files from git; rotate every secret.
- Delete the unused TypeScript backend (`server/src/app.ts`, `index.ts`, `routes/index.ts`, `routes/modules/`); keep exactly one knexfile.
- Re-enable rate limiting; restrict CORS to `*.mybrand.com`.
- Commit current work-in-progress in logical chunks.
- Add CI (GitHub Actions): lint, tests, build on every push.

---

## Phase 2 — Multi-tenancy & automatic subdomains (≈2 weeks)

### Subdomain mechanics
No per-restaurant DNS work needed — set up the wildcard once:

- DNS: `*.mybrand.com → server IP`
- TLS: one wildcard cert via **Caddy** (on-demand TLS / DNS-01) or Cloudflare proxy — every new subdomain gets HTTPS automatically.
- Creating a restaurant with slug `pizzaroma` makes `pizzaroma.mybrand.com` live immediately; only the slug row needs to exist.

| Host | Serves |
|---|---|
| `mybrand.com` | Marketing site, pricing, signup |
| `admin.mybrand.com` | Your super admin console |
| `{slug}.mybrand.com` | QR menu + customer account |
| `{slug}.mybrand.com/admin` | Restaurant staff area (POS, kitchen, stock, reports) |
| `api.mybrand.com` (or `/api` per host) | Backend |

Reserved slugs (`www`, `admin`, `api`, `app`, `mail`, `static`) blocked at signup. Custom domains (`menu.pizzaroma.ma`) can be added later via Caddy on-demand TLS.

### Data model
Rename/promote `branches` → **`restaurants`**:

```
id, slug (unique), name, status (trialing|active|past_due|suspended|cancelled),
template, theme_json, currency, timezone, owner_user_id, plan_id,
custom_price_cents, stripe_customer_id, stripe_subscription_id,
trial_ends_at, created_at
```

Every business table gets **`restaurant_id NOT NULL` + index**: menu, categories, items, variants, tables, orders, order_items, payments, stock, recipes, settings, employees, audit logs, and all new tables from later phases.

### Tenant resolution
- `resolveTenant` middleware reads the `Host` header, extracts the slug, loads the restaurant (cached), sets `req.tenant`.
- Helper `tdb(req)('orders')` auto-scopes every query to `restaurant_id = req.tenant.id`. No route touches tables directly — restaurant A can never read restaurant B's data.
- Staff JWTs carry `restaurant_id`; a token from restaurant A is rejected on restaurant B's subdomain.
- Socket.IO rooms: `r:{restaurantId}:kitchen`, `r:{restaurantId}:cashier`, `order:{orderId}`.
- `suspended` restaurants show "temporarily unavailable" on the menu and a billing-only screen in admin.

### Roles
- **Platform:** `super_admin` (you)
- **Restaurant staff:** `owner, manager, cashier, kitchen, waiter`
- **Customers:** separate `customers` table — never the `users` table, never a staff login.

---

## Phase 3 — Order flow finalization (≈1.5 weeks)

### One state machine, every channel

```
PENDING ──confirm──▶ CONFIRMED ──▶ PREPARING ──▶ READY ──▶ SERVED / PICKED_UP ──▶ COMPLETED
   └───────────── cancel (any time before READY) ─────────────▶ CANCELLED

payment_status: UNPAID → PARTIAL → PAID → (REFUNDED)
```

- **QR orders** start `PENDING`; cashier confirms (or restaurant enables auto-confirm).
- **POS orders** start `CONFIRMED` directly.
- Every transition validated server-side; illegal moves return 409.
- Each transition emits a socket event (kitchen, cashier, customer status page) and is logged to `order_events` for the timeline and analytics.
- **Idempotency key** on order creation prevents duplicate orders from double-taps.

### Per-role views
- **Customer:** Placed → live progress → Ready, with PIN, QR code, and points earned if logged in.
- **Kitchen:** New / Preparing / Ready columns, per-ticket timer, sound on new order, bump button.
- **Cashier:** queue of unpaid orders → pay.

### Template contract
All four templates (Default, Elegant, Minimal, Modern) implement one shared component set: `Header, CategoryNav, ItemCard, ItemSheet, CartBar, AccountShell, PointsCard, OrderCard`, each with its own design tokens. Menu, cart, checkout, order status, **and customer account** all render through whichever template the restaurant picked, so everything matches. Admin gets a live preview when choosing template/colors.

---

## Phase 4 — Stock management (≈1.5 weeks)

Builds on existing inventory code:

- **Automatic deduction:** order → `CONFIRMED` subtracts recipe quantities in one transaction, recorded in `stock_movements` with the order ID; reversed on cancellation.
- **Unit conversion** per stock item (kg↔g, L↔ml).
- **Out-of-stock:** menu items using a depleted ingredient auto-flip to "Sold out."
- **Low-stock alerts:** admin badge + optional daily email/WhatsApp.
- **Suppliers & purchase orders:** receiving a PO adds stock and records cost.
- **Waste log** and **stocktake** (counted vs. expected variance report).
- **Food cost:** cost per item from recipes × ingredient cost, margin % on reports.

---

## Phase 5 — Loyalty program (≈2.5 weeks)

### Tables

- **`customers`**: `id, restaurant_id, phone_e164, name, email, birthday, points_balance, lifetime_points, total_spent, visits, last_visit_at, marketing_consent, created_at` — unique on `(restaurant_id, phone_e164)`.
- **`loyalty_settings`** (per restaurant): `enabled, earn_mode (per_amount|per_item), points_per_unit, min_redeem_points, points_expiry_days, welcome_bonus`.
- **`menu_items.loyalty_points`** (optional): fixed points for buying that specific product.
- **`rewards`**: `id, restaurant_id, name, type (free_item|amount_off|percent_off), menu_item_id, points_cost, active, stock_limit`.
- **`loyalty_ledger`**: `id, restaurant_id, customer_id, order_id, type (earn|redeem|adjust|expire|reverse), points, balance_after, staff_user_id, note` — the source of truth; `customers.points_balance` is a cached copy.

### Rules
- Points earned **only when order is fully PAID**, calculated on amount actually paid after discounts.
- Points **reversed** on refund/cancellation.
- **Redeeming requires proof**: OTP to the customer's phone, or scan of their member QR code. Earning needs no proof.
- Manual adjustments require manager role + a note, logged to audit log.

### Customer sign-in (on restaurant's site)
`{slug}.mybrand.com` → Sign in → phone number → OTP → name on first visit (+ optional birthday for a birthday reward). JWT scoped to that restaurant persists, linking future QR orders automatically.

### POS pay flow
1. Cashier builds order, taps **Pay**.
2. **"Loyalty customer?"** modal: large phone keypad, +212 preset, auto-search once complete.
   - **Found:** name, points balance, affordable rewards shown. Cashier taps a reward; customer confirms via OTP or QR scan; discount applied as a line item.
   - **Not found:** "Create member" (phone + optional name, welcome bonus applied) or go back to fix the number.
   - **Skip:** proceeds to payment.
3. **Payment step:** cash (with change calc), card, or split. If skipped, a **"+ Add loyalty customer"** chip stays visible so a mistaken skip can be corrected before the payment is confirmed.
4. **Confirm:** receipt shows points earned + new balance; optional SMS/WhatsApp confirmation to customer.

Every modal outcome (found / created / skipped / skipped-then-added) is logged for measuring cashier adoption.

### Customer account (same template as the menu)
- **Home:** points card with QR member code, progress to next reward, currently-affordable rewards.
- **Rewards:** catalog, showing "X points more" for locked ones.
- **Orders:** purchase history, order detail, **reorder**.
- **Points history:** ledger in plain language.
- **Profile:** name, email, birthday, marketing consent, logout, delete account.

---

## Phase 6 — Restaurant admin additions (≈1.5 weeks)

- **Customers page:** searchable/filterable table (phone, name, visits, total spent, points, last visit, segments: new / regular / at-risk / VIP). Detail view per customer: orders, points ledger, manual adjustment. **CSV export** restricted to owner role, logged.
- **Loyalty settings:** earn rules, rewards catalog editor, expiry, welcome/birthday bonuses.
- **Analytics** (nightly cron builds daily aggregates per restaurant; today's numbers computed live):
  - Sales: revenue, orders, AOV, hourly heatmap, top items, sales by channel (QR/POS/takeaway).
  - Loyalty: total members, new members, repeat rate, % revenue from members, points issued vs. redeemed, **outstanding points liability**, cashier skip rate.
  - Stock: consumption, waste, food cost %.
  - Staff: orders and cash handled per cashier.

---

## Phase 7 — Stripe billing (≈1.5 weeks)

### Tables
- **`plans`**: `id, name, base_price_cents, currency, interval=month, stripe_price_id, features_json` (limits: max tables, max staff, loyalty on/off).
- **`subscription_events`**: log of every webhook received, for idempotency.
- **`platform_invoices`**: mirror of Stripe invoices for your dashboard.

### Signup flow
1. Restaurant fills in name, slug (checked live for availability), owner email/phone/password on `mybrand.com/signup`.
2. Backend creates restaurant as `pending`, creates a Stripe Customer, opens a **Stripe Checkout Session** (`mode: subscription`, with trial).
3. `checkout.session.completed` webhook → restaurant set to `trialing`; default menu, tables, settings, and template seeded; email sent: "Your restaurant is live at pizzaroma.mybrand.com".
4. Owner lands on onboarding checklist: logo, template, menu, tables/QR codes, staff.

### Per-restaurant pricing
Stripe prices are immutable, so an override works like:
- Console: Restaurant → "Change price" → e.g. 250 MAD.
- Backend creates/reuses a Stripe Price at that amount, updates the subscription item, applies **from next billing cycle** (`proration_behavior: none`) or "now with proration" as chosen.
- `custom_price_cents` saved; change written to audit log.

### Webhooks to handle
- `invoice.paid` → `active`
- `invoice.payment_failed` → `past_due`, then auto-suspend after grace period (daily cron)
- `customer.subscription.updated` / `customer.subscription.deleted`

Restaurants manage card/invoices via the **Stripe Customer Portal**, linked from Settings → Billing.

---

## Phase 8 — Super admin console at `admin.mybrand.com` (≈2 weeks)

- **Overview:** active/trialing/past-due/suspended counts, **MRR**, churn, new signups, platform-wide GMV.
- **Restaurants list:** status, plan, price, MRR, 30-day orders, last activity, created date.
- **Restaurant detail:** same data the owner sees (orders, menu, customers, staff, stock, analytics), **read-only by default**, plus:
  - Change price, change plan, extend trial, suspend/reactivate, cancel.
  - **"Log in as owner"** (impersonation) — visible banner, time limit, audit-logged.
- **Payments:** every Stripe invoice/failed payment, with retry link.
- **Plans:** edit base prices and features.
- **Audit log:** every action you take on any restaurant.
- **Access:** separate super-admin login, **2FA required**.

---

## Phase 9 — Production hardening & launch (≈1.5 weeks)

- **Deployment:** Docker Compose — Caddy (wildcard TLS), Node API (PM2 or 2+ replicas), MySQL, Redis (Socket.IO adapter, cache, rate limiting, OTP storage), printer service.
- **Uploads:** move to S3-compatible storage (Cloudflare R2), one folder per restaurant.
- **Backups:** automated nightly DB backups to R2, with a tested restore procedure.
- **Monitoring:** Sentry for errors, uptime checks on API + a sample tenant.
- **Tests:** tenant isolation (A can never read B's data), order state machine, loyalty earn/redeem/reverse math, Stripe webhooks (via Stripe CLI fixtures), end-to-end POS-pay-with-loyalty in Playwright.
- **Legal:** privacy policy + terms. Storing Moroccan customer phone numbers likely requires **CNDP registration** under law 09-08; customers must be able to request data deletion.

---

## Build order & timeline

| Step | Phase | Effort |
|---|---|---|
| 1 | Cleanup | 1 wk |
| 2 | Multi-tenancy + subdomains | 2 wk |
| 3 | Order flow + template contract | 1.5 wk |
| 4 | Stock | 1.5 wk |
| 5 | Loyalty + customer accounts + POS modal | 2.5 wk |
| 6 | Restaurant admin: customers page + analytics | 1.5 wk |
| 7 | Stripe billing | 1.5 wk |
| 8 | Super admin console | 2 wk |
| 9 | Hardening + launch | 1.5 wk |

**Total: ≈15 weeks**, one developer full-time. Billing (step 7) is sequenced late so the Stripe decision in Section 0 can be resolved while product work proceeds — nothing before step 7 depends on it.

Each phase ends with a working, clickable build. No phase advances until tenant-isolation tests pass.
