# ArogyaFlow — Backend Roadmap

*Connected Hospital Operations Platform · by Elan Iqbal*

This document plans the migration of ArogyaFlow from a localStorage demo into a
real, secure, multi-tenant SaaS backend. **Nothing here changes the running app
yet** — it is the architecture we build toward. The current demo keeps working
through the `storageAdapter` boundary already in the code.

---

## 1. Recommended stack

### Recommendation: **Supabase (PostgreSQL + Auth + Storage + RLS)**

For ArogyaFlow specifically, Supabase is the best first backend. Reasoning:

| Need | Why Supabase fits |
|------|-------------------|
| Real database | Managed **PostgreSQL** — relational, exactly right for patients/episodes/invoices with strong referential integrity. |
| Authentication | Built-in **Auth** (email/password, magic link, OAuth, MFA) — no need to hand-roll password handling. |
| Department + tenant isolation | **Row-Level Security (RLS)** enforces access *in the database*, not just the UI — this directly satisfies Priorities 1, 4 and 8. |
| File uploads (lab results, documents) | Built-in **Storage** with access policies. |
| Audit logs | Postgres triggers / a dedicated `audit_logs` table write server-side. |
| Multi-hospital (Priority 7) | `organization_id` column + RLS policy = clean tenant isolation. |
| Speed to ship | Auto-generated REST + JS client; our `storageAdapter` swaps to a `supabaseAdapter` with the same `read/write` shape. |
| Cost | Generous free tier; predictable paid tiers as hospitals onboard. |

### Why not the others (brief)

- **Firebase** — excellent auth/realtime, but Firestore is document-based; our
  data is strongly relational (invoices ↔ items ↔ episodes ↔ patients). Modelling
  that in Firestore fights the grain, and cross-collection reporting is harder.
- **Express/NestJS + PostgreSQL** — maximum control, but we write and secure auth,
  RLS-equivalent logic, file handling, and deployment ourselves. More time, more
  attack surface to get wrong. Good *later* if we outgrow Supabase.
- **Django/FastAPI + PostgreSQL** — same trade-off as Nest; great if the team is
  Python-first, but adds a second language to a JS/React codebase.

**Decision:** Start on Supabase. Its RLS model is the single biggest security win
for a multi-tenant medical app, and it matches our existing repository/adapter
seam. If scale or custom logic later demands it, a NestJS service can sit
*alongside* Supabase (sharing the same Postgres) without a rewrite.

---

## 2. Migration path (safe, incremental)

The app already separates data access into three layers:

```
UI components
   └── repositories.js      (named domain CRUD)
         └── HospitalContext (store + composite actions)
               └── storageAdapter.js   ← the swap point
```

Migration replaces only the bottom layer, in stages:

**Stage 0 — today.** `localStorageAdapter`. Demo works offline.

**Stage 1 — Supabase project + schema.** Create the Postgres schema
(see `DATABASE_SCHEMA.md`), enable RLS, seed one organization
(Dr. P. Alikutty's). No app change yet.

**Stage 2 — Auth.** Replace the demo `AuthContext` login with Supabase Auth.
Map each demo user to a real auth user + a `staff_profiles` row carrying
`organization_id`, `role`, `department`.

**Stage 3 — Read path.** Introduce `supabaseAdapter.read()` behind a feature
flag. Repositories already abstract reads, so components don't change.

**Stage 4 — Write path.** Point composite actions (`admitPatient`,
`convertToIpd`, `clearGate`, lab workflow, dispensing) at Supabase calls /
Postgres functions. Each becomes a transactional RPC.

**Stage 5 — Files + documents.** Lab result uploads and generated PDFs move to
Supabase Storage with per-tenant policies.

**Stage 6 — Retire localStorage** for production tenants; keep it as an explicit
"demo mode" flag for sales demos.

At every stage the app stays runnable; we never do a big-bang cutover.

---

## 3. Environments & deployment

- **Frontend:** Vite build → static host (Vercel / Netlify / Cloudflare Pages),
  HTTPS-only.
- **Backend:** Supabase (managed Postgres, Auth, Storage, Edge Functions for any
  custom server-side logic such as invoice finalisation or critical-result
  alerts).
- **Secrets:** only the Supabase **anon** public key ships to the frontend
  (designed to be public, protected by RLS). Service-role keys live only in Edge
  Functions / server env vars — never in frontend code.
- **Config:** `.env` files per environment (`.env.local`, `.env.production`),
  never committed.

See `DEPLOYMENT.md` for the step-by-step.

---

## 4. What this enables (mapped to the brief)

- **P1/P2 task visibility & ownership** → RLS policies on `tasks` by
  `organization_id`, `assigned_department`, `assigned_user_id`, plus
  admin/management bypass.
- **P4 department isolation** → RLS policies per table by department/role.
- **P6 backend** → Supabase, documented here.
- **P7 multi-tenant** → `organization_id` everywhere + tenant RLS.
- **P8 security** → server-side enforcement, Auth, RLS, audit, storage policies.

See `SECURITY.md`, `DATABASE_SCHEMA.md`, `API_CONTRACT.md`, `MULTI_TENANT.md`.
