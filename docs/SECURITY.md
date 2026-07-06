# ArogyaFlow — Security & Authentication Plan

*Medical + financial data across multiple tenants. Security is not optional.*

## Core principle

> **Frontend restrictions are UX, not security.** Every permission must be
> enforced again on the server (Supabase RLS + Edge Functions). The React app
> hides what a user can't do; the database refuses what they shouldn't do —
> even if the UI is bypassed, a request is forged, or a route is hit directly.

This plan has two halves: what we **enforce server-side** (the real boundary),
and what we **harden client-side now** (defence in depth + good UX), since the
backend isn't live yet.

---

## 1. Authentication

- **Provider:** Supabase Auth. No custom password storage. Passwords are hashed
  by the provider (bcrypt/scrypt) — ArogyaFlow code never sees raw passwords.
- **Methods:** email + password to start; magic-link and OAuth optional; **MFA**
  for admin/management/finance recommended.
- **Account creation:** invite-only. Staff never set passwords for others
  (matches the app's existing rule). Invited users set their own.
- **Sessions:** short-lived access token + refresh token; **idle timeout** and
  absolute expiry; logout revokes. Sensitive actions (approvals, discharge
  override) may require recent re-auth.
- **JWT claims:** `user_id`, `organization_id`, active `role`, `department`.
  The server trusts these claims, never client-supplied org/role in the body.

## 2. Authorization — three enforced layers

1. **Tenant** — `organization_id` on every row; RLS policy
   `organization_id = (auth.jwt() ->> 'organization_id')::uuid`. No query can
   ever cross tenants.
2. **Role** — capability checks (the existing `roles.js` capability map becomes
   the source for both UI gating *and* RLS policy predicates / Edge Function
   guards).
3. **Department + ownership** — row-level predicates, e.g. tasks visible only
   when `assigned_department = jwt.department` OR `assigned_user_id = jwt.user_id`
   OR `jwt.role in ('admin','management')`.

### Task visibility policy (Priority 1/2) — example RLS

```sql
-- tasks: a caller sees a task only if it's theirs, their department's,
-- or they are admin/management.
create policy task_visibility on tasks for select using (
  organization_id = current_org()
  and (
    assigned_user_id = auth.uid()
    or assigned_department = current_department()
    or current_role_key() in ('admin','management')
  )
);

-- only the assignee (or admin/mgmt) may complete:
create policy task_complete on tasks for update using (
  organization_id = current_org()
  and (
    assigned_user_id = auth.uid()
    or (assigned_user_id is null and assigned_department = current_department())
    or current_role_key() in ('admin','management')
  )
);
```

(`current_org()`, `current_department()`, `current_role_key()` are SQL helpers
reading JWT claims.)

### Department isolation (Priority 4)

Each table gets a SELECT policy expressing who may read it. Examples:
- `lab_requests` / `lab_results`: `current_department() = 'lab'` OR requesting
  doctor `= auth.uid()` OR admin/mgmt.
- `pharmacy_inventory`, `stock_movements`: pharmacy + admin/mgmt only.
- `consultations` clinical notes: care team for that patient; finance sees only
  `billable_items` references, never the note body.
- `audit_logs`: admin/management/IT; finance restricted to finance modules.

## 3. Server-enforced workflow invariants (Priority 11)

These are validated in Edge Functions / Postgres functions, not just the UI:

- Lab task **cannot complete without a `lab_results` row**.
- Pharmacy dispense **requires dispensing details**; stock decremented atomically.
- Discharge **cannot finalise unless all gates cleared or an audited override**.
- **No double-billing:** a `billable_item` may be attached to at most one
  non-cancelled invoice (unique partial constraint).
- **Unique MRN** per organization (DB constraint).
- Discount above threshold requires an **approved** `discount_request`.
- Invalid status transitions rejected (state-machine check).

## 4. Input, files, transport

- **Input validation** server-side on every write (types, ranges, enums); shared
  zod schemas between client and Edge Functions where possible.
- **File uploads:** allowlist MIME types, size caps, store in per-tenant Storage
  buckets with RLS; generate signed, expiring URLs; optional malware scan.
- **XSS:** React escapes by default; never `dangerouslySetInnerHTML` with user
  data. Printed documents escape all interpolated fields.
- **CSRF:** token-based auth in headers (not cookies) avoids classic CSRF; if
  cookies are used, enable SameSite + CSRF tokens.
- **Secure headers:** HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
  `Content-Security-Policy`, `X-Frame-Options` at the host/CDN.
- **HTTPS only**, HSTS preload.
- **Rate limiting:** on auth and write endpoints (Supabase + CDN/WAF).

## 5. Secrets & config

- Only the Supabase **anon** key in the frontend (public by design, guarded by
  RLS). **Service-role key only in Edge Functions / server env** — never shipped.
- All secrets via environment variables; `.env*` git-ignored; no secrets in the
  repo or client bundle.

## 6. Audit & recovery

- `audit_logs` is **append-only** (no update/delete policy) and tenant-scoped.
- Log: logins, permission/role changes, patient create/edit/delete, lab
  result/verify, dispensing, stock adjust, invoice/payment, discount decisions,
  discharge/override, demo import/reset, document generation.
- **Backups:** managed Postgres PITR (point-in-time recovery); periodic logical
  exports; documented restore drill (see `DEPLOYMENT.md`).

## 7. Client-side hardening we can do *now* (pre-backend)

Even in demo mode, these reduce risk and prep the migration:
- Centralised permission checks (`can()`/`canSeeModule()`) on every action button
  **and** route guard — not UI-only by accident.
- Task visibility filter applied in the data selector, not per-component.
- Validation guards: duplicate MRN, double-billing, lab-complete-needs-result,
  discharge-gate enforcement, discount/GST math validation.
- No secrets anywhere in the frontend (already true).
- Escape interpolated values in generated print HTML.

> These are exactly Chunks 2–4 of the implementation plan. This document is the
> spec they implement against.
