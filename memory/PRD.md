# ShopStack — Multi-Tenant SaaS Commerce

## Problem Statement
Build a SaaS ecommerce project using the `all-in-one-bus-ai/saas-ecom` GitHub project. User provided Supabase credentials and asked to keep the project stack as-is.

## Tech Stack
- **Frontend/Backend**: Next.js 13.5 (App Router) + TypeScript + Server Actions
- **Database & Auth**: Supabase (Postgres + auth.users + RLS policies)
- **UI**: Tailwind + shadcn/ui + Lucide icons
- **Payments (configured, mocked)**: Stripe (keys not provided)
- **Health stub**: FastAPI on `:8001` at `/api/health` (satisfies supervisor)

## Architecture
- `/app/frontend` — Next.js application (port 3000)
- `/app/backend` — Minimal FastAPI health stub (port 8001)
- `/app/frontend/supabase/migrations` — SQL migrations (already applied to Supabase)

## Core Features (existing, working)
- Landing page with role demo links
- Auth: login, register (Supabase Auth)
- Public storefront per tenant (`/[tenantSlug]`) with product grid, categories, hero, cart icon
- Store Admin: products, orders, customers, staff, theme, analytics
- Store Manager / Operative role dashboards
- Super Admin (`/saas`): list tenants
- Tenant onboarding (`/onboarding`)
- Dynamic theme system (3 themes: Minimal, Bold, Classic)
- RBAC (super_admin, store_admin, manager, operative) via `tenant_memberships`

## Seeded Data
- 2 tenants: `techstore` (TechStore Pro), `fashionboutique` (Fashion Boutique)
- 3 themes, 5 categories, 4+ products
- 4 demo users (all password `Demo1234!`) — see test_credentials.md

## What's been implemented (dates)
- 2026-01-21: Initial setup — cloned repo to /app/frontend, configured Supabase credentials, created backend health stub, updated supervisor to run Next.js via `yarn start → next dev`. All routes returning HTTP 200. Landing and storefront verified via screenshots. All 4 demo accounts successfully authenticate via Supabase.

## Known Items / Notes
- **SUPABASE_SERVICE_ROLE_KEY mismatch**: The service role key provided belongs to a different Supabase project (`vvctaapqlynrbrlegeoa`) than the URL (`zfjyhmkomzoqpawbtpwt`). This does not affect client-side functionality (uses anon key) but any server-side service-role operations will fail. User should provide the correct service role key for project `zfjyhmkomzoqpawbtpwt` if server-role features are needed.
- Stripe keys not set — checkout flow will be inactive until Stripe keys are added to `.env.local`.

## Backlog / Next Priorities
- P0: Confirm SERVICE_ROLE_KEY if needed for server actions
- P1: Wire Stripe checkout (keys needed)
- P1: Build cart page + checkout flow end to end
- P2: Product detail page
- P2: Email notifications on order
- P2: Customer-facing account (order history)

## User Personas
- **SaaS Super Admin** — oversees all tenants on the platform
- **Store Admin** — runs their store (products, orders, staff, theme)
- **Store Manager** — day-to-day order management
- **Store Operative** — fulfillment staff
- **Shopper** — anonymous visitor browsing/buying on a tenant storefront
