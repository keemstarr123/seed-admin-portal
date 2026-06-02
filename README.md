# SEED Admin Portal

Next.js web admin portal for the SEED Flutter app.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Fill in the same Supabase project values used by the mobile app.
3. Add `SUPABASE_SERVICE_ROLE_KEY` only in the server environment.
4. Run:

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:3001`.

## Required Admin Role

The logged-in Supabase user must have a row in `public.user_roles`:

```sql
insert into public.user_roles (user_id, role)
values ('<auth-user-id>', 'super_admin');
```

See `../docs/admin_portal_prd.md` for the product scope and workflows.
