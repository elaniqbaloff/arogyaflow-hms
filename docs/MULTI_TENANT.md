# ArogyaFlow — Multi-Tenant SaaS Plan

*How ArogyaFlow serves many hospitals from one codebase.*

## Model: shared database, row-level isolation

One Postgres database; every tenant's rows tagged with `organization_id` and
fenced off by **Row-Level Security**. This is the standard SaaS model — simplest
to operate, cheapest to run, and (with RLS) safe. If a future enterprise client
demands physical separation, that tenant can be moved to a dedicated project
later without code changes.

## What "tenant" means here

```
organization (hospital)
  ├── branding: logo, name, name_ar, address, colors
  ├── memberships (users + their role + department in THIS org)
  ├── departments, pricing master, document templates
  ├── patients, episodes, consultations, lab, pharmacy, therapies
  ├── invoices, payments, approvals
  └── tasks, notifications, audit_logs
```

The **currently configured client** is `Dr. P. Alikutty's Ayurveda & Modern
Hospital`. Today it's the only org; the demo seed represents it.

## Rules

1. **`organization_id` on every major table** (see `DATABASE_SCHEMA.md`).
2. **Server derives tenant from the JWT**, never from the request body — a user
   cannot ask for another org's data.
3. **Users can belong to multiple orgs** via `memberships`; the active org lives
   in the session and can be switched (`/auth/switch-org`), re-issuing the JWT.
4. **Roles can be org-specific** — a person may be a doctor at one hospital and
   management at another.
5. **Branding is per-org** — logo, names (EN/AR), address, palette load from the
   `organizations` row; the app's `brand.js` becomes *product* identity
   (ArogyaFlow / Elan Iqbal) while the *client* identity comes from the tenant.
6. **Templates, pricing, departments, services are per-org.**
7. **Audit logs are per-org** and never visible across tenants.

## Frontend implications (when backend lands)

- `brand.js` already separates **product** (ArogyaFlow) from **client**
  (the hospital). Migration: keep product constants static; load client/tenant
  fields from the active organization instead of hardcoding Dr. P. Alikutty's.
- A tenant context provider supplies `organization` to the app; the print
  documents and headers read client identity from it.
- Onboarding a new hospital = create an `organizations` row + invite its admin;
  no deploy.

## Out of scope for now

Billing the hospitals (subscription/Stripe), per-tenant custom domains, and
tenant self-service signup are future work — noted so they're not forgotten.
