# ArogyaFlow — Deployment Plan

*Target production topology and rollout steps.*

## Topology

```
[ Browser ] ──HTTPS──> [ Static frontend  (Vite build) ]
                              │  Supabase JS client (anon key)
                              ▼
                       [ Supabase ]
                         ├── Auth         (sessions, MFA)
                         ├── Postgres     (data + RLS policies)
                         ├── Edge Funcs   (workflow RPCs, service-role only)
                         └── Storage      (lab results, generated PDFs)
```

## Hosting

- **Frontend:** Vercel / Netlify / Cloudflare Pages. `npm run build` → static
  assets on CDN. HTTPS + HSTS enforced. Security headers + CSP set at host.
- **Backend:** Supabase managed project (Postgres, Auth, Storage, Edge Functions).
- **Custom logic:** Edge Functions for invoice finalisation, lab completion +
  doctor notification, dispensing+stock, discharge gating, critical-result
  alerts — anything needing the service-role key or a transaction.

## Environments

| Env | Frontend | Supabase project |
|-----|----------|------------------|
| local | `vite dev` | local/branch project, demo seed |
| staging | preview deploy | staging project, anonymised data |
| production | main deploy | production project, real tenants |

`.env.local` / `.env.production` hold `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` only. Service-role key lives in Edge Function env, never
in the frontend.

## Rollout steps

1. Create Supabase project; apply schema (`DATABASE_SCHEMA.md`) via migrations.
2. Enable RLS on all tenant tables; add policies (`SECURITY.md`).
3. Seed org #1 (Dr. P. Alikutty's) + invite admin.
4. Wire Auth (replace demo `AuthContext`).
5. Add `supabaseAdapter`; flip read path behind a flag; verify parity with demo.
6. Move writes to Edge Function RPCs (workflow invariants enforced server-side).
7. Move files to Storage with per-tenant policies.
8. Penetration test: attempt cross-tenant reads, unauthorised task completion,
   direct-route access, double-billing, discharge without clearance — all must
   fail server-side.
9. Configure backups/PITR; run a **restore drill**.
10. Cut production tenants over; keep `demo mode` flag for sales demos.

## Backup & recovery

- Postgres **PITR** enabled; retention per plan.
- Scheduled logical exports to object storage.
- Documented + rehearsed restore procedure (target RTO/RPO agreed with client).

## CI/CD

- PR → typecheck + `npm run build` + lint must pass.
- DB changes as **versioned migrations** (never manual prod edits).
- Preview deploy per PR against staging Supabase.
