# ShopStack Test Credentials

All demo accounts share password: `Demo1234!`

| Role | Email | Access |
|---|---|---|
| Super Admin | superadmin@demo.com | `/saas` — platform-wide admin |
| Store Admin | storeadmin@demo.com | `/store/techstore/admin` — full store admin for TechStore Pro |
| Manager | manager@demo.com | `/store/techstore/manager` — store manager |
| Operative | operative@demo.com | `/store/techstore/operative` — store operative |

## Public routes (no login needed)
- `/` — Landing page
- `/login`, `/register` — auth pages
- `/techstore` — public storefront for TechStore Pro tenant
- `/fashionboutique` — public storefront for Fashion Boutique tenant

## Supabase backend
- URL: `https://zfjyhmkomzoqpawbtpwt.supabase.co`
- Anon key + Service key in `/app/frontend/.env.local`
