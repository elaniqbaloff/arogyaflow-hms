# ArogyaFlow — API Contract Draft

*Draft for backend migration. With Supabase, most CRUD is auto-generated REST +
RLS; the endpoints below describe the **logical contract** (and the custom Edge
Functions/RPCs needed for multi-step workflows). Paths shown REST-style.*

## Conventions

- Base: `/api/v1`
- **Auth:** every endpoint except `/auth/*` requires a valid session (JWT).
  JWT carries `organization_id`, `role`, `department`, `user_id`.
- **Tenant:** server derives `organization_id` from the token — never from the
  client body. All queries are tenant-scoped by RLS.
- **Audit:** endpoints marked **[audit]** must write an `audit_logs` row.
- **Roles:** listed roles may call; `admin` and `management` implicitly allowed
  except where noted (management is usually read-only on clinical/financial).
- All list endpoints support `?status=&department=&from=&to=&q=&page=`.

---

## Auth

| Method | Path | Purpose | Roles | Notes |
|--------|------|---------|-------|-------|
| POST | `/auth/login` | Email+password login | public | Supabase Auth; returns session. **[audit]** login |
| POST | `/auth/logout` | End session | any | **[audit]** |
| POST | `/auth/refresh` | Refresh token | any | session expiry handling |
| GET | `/auth/me` | Current user + memberships | any | resolves active org/role |
| POST | `/auth/switch-org` | Change active organization | multi-org users | re-issues JWT |

## Organizations & users (admin/IT)

| Method | Path | Purpose | Roles |
|--------|------|---------|-------|
| GET/POST | `/organizations` | List/create tenant | admin (create = super-admin) |
| PATCH | `/organizations/:id` | Branding, address, plan | admin |
| GET/POST | `/users` | List/invite users | admin, it |
| PATCH | `/users/:id` | Update profile/status | admin, it |
| GET/POST | `/roles`, `/role-permissions` | RBAC config | admin |
| GET/POST | `/departments` | Department config | admin, management |

> Account creation is invite-based; **passwords are never set by staff on behalf
> of others** — users set their own via Supabase Auth invite flow.

## Patients & visits

| Method | Path | Purpose | Roles | Validation |
|--------|------|---------|-------|------------|
| GET | `/patients` | Search/list | reception, doctor, nurse, finance(min), management | tenant-scoped |
| POST | `/patients` | Register | reception, admin | **unique (org, mrn)**; auto-open OPD episode. **[audit]** |
| GET | `/patients/:id` | Profile + timeline | care team, reception, management | field-level scope by role |
| PATCH | `/patients/:id` | Edit demographics | reception, doctor, admin | **[audit]** |
| POST | `/patients/:id/convert-to-ipd` | OPD→IPD, same MRN | reception, doctor | bed available; creates IPD episode. **[audit]** |
| GET/POST | `/appointments` | Manage appointments | reception, doctor | valid status transitions |
| POST | `/appointments/:id/check-in` | Issue queue token | reception | |
| GET | `/queue` | OPD queue | reception, doctor | department-scoped |

## OPD / IPD / beds / nursing

| Method | Path | Purpose | Roles | Validation |
|--------|------|---------|-------|------------|
| GET/POST | `/consultations` | Clinical notes | doctor | own patients |
| POST | `/episodes/:id/admit` | Admit to bed | reception, doctor | bed free. **[audit]** |
| POST | `/episodes/:id/transfer` | Bed transfer | reception, nurse | records history. **[audit]** |
| POST | `/episodes/:id/clear-gate` | Mark discharge gate | role per gate | gate→role match. **[audit]** |
| POST | `/episodes/:id/discharge` | Finalise discharge | reception, admin | **all gates or override**. **[audit]** |
| GET/POST | `/beds` | Bed board / status | reception, nurse, management(r) | not occupied→occupied directly |
| GET/POST | `/vitals` | Vitals chart | nurse, doctor(r) | numeric ranges |
| GET/POST | `/nursing-notes` | Nursing notes + med status | nurse | |

## Lab (reference workflow — see BACKEND_ROADMAP / LAB flow)

| Method | Path | Purpose | Roles | Validation |
|--------|------|---------|-------|------------|
| POST | `/lab/requests` | Doctor creates request | doctor | creates lab task + timeline + **[audit]** |
| GET | `/lab/requests` | Lab work queue | **lab only** + admin/mgmt | dept-isolated |
| POST | `/lab/requests/:id/accept` | Lab accepts task | lab | locks to user |
| POST | `/lab/requests/:id/collect` | Sample collected | lab (assigned) | |
| POST | `/lab/requests/:id/result` | Enter/upload result | lab (assigned) | result required before complete |
| POST | `/lab/requests/:id/verify` | Verify result | lab senior | |
| POST | `/lab/requests/:id/complete` | Close + notify doctor | lab (assigned) | **blocked without result**; creates billable item; notifies doctor. **[audit]** |
| GET | `/patients/:id/lab-results` | Results for doctor | doctor (requester), care team | flows back automatically |

## Pharmacy

| Method | Path | Purpose | Roles | Validation |
|--------|------|---------|-------|------------|
| GET | `/pharmacy/queue` | Prescriptions to dispense | **pharmacy only** + admin/mgmt | dept-isolated |
| POST | `/pharmacy/dispense/:rxId` | Dispense | pharmacy | requires dispensing details; reduces batch stock; creates billable item. **[audit]** |
| GET/POST | `/pharmacy/inventory`, `/batches` | Stock + batches | pharmacy | expiry/qty validation |
| GET | `/pharmacy/alerts` | Low-stock / near-expiry | pharmacy | |

## Panchakarma

| Method | Path | Purpose | Roles |
|--------|------|---------|-------|
| GET/POST/PATCH | `/therapies` | Schedule/track sessions | doctor, nurse | 
| POST | `/therapies/:id/complete` | Complete session | doctor/therapist | creates billable item |

## Billing & approvals

| Method | Path | Purpose | Roles | Validation |
|--------|------|---------|-------|------------|
| GET | `/billing/billable-items` | Pending items | finance | not yet invoiced |
| POST | `/billing/invoices` | Generate invoice | finance | no duplicate billing of same item; discount needs approval if over threshold. **[audit]** |
| POST | `/billing/invoices/:id/payment` | Record payment | finance | amount ≤ balance. **[audit]** |
| POST | `/billing/discount-requests` | Request discount | doctor, reception, finance | cannot self-approve |
| GET | `/approvals` | Approval queue | admin, management, finance | |
| POST | `/approvals/:id/decide` | Approve/reject | admin, management, finance | **not own request**. **[audit]** |

## Tasks & notifications (visibility-enforced)

| Method | Path | Purpose | Roles | Validation |
|--------|------|---------|-------|------------|
| GET | `/tasks` | **Only tasks visible to caller** | all | RLS: assigned_user OR assigned_dept matches, OR admin/mgmt |
| POST | `/tasks/:id/accept` | Accept dept task | assigned dept | locks to user |
| POST | `/tasks/:id/start` | Start | assignee | must be accepted |
| POST | `/tasks/:id/complete` | Complete | assignee | type-specific requirements (e.g. lab result). **[audit]** |
| POST | `/tasks/:id/reassign` | Reassign/override | admin, management | **[audit]** |
| GET | `/notifications` | Caller's notifications | any | own only |
| POST | `/notifications/:id/read` | Mark read | owner | |

## Audit, reports, documents, files

| Method | Path | Purpose | Roles |
|--------|------|---------|-------|
| GET | `/audit-logs` | Filterable trail | admin, management, it; finance(finance-scope) |
| GET | `/reports/:kind` | Operational/financial reports | management, finance, admin |
| GET/POST | `/document-templates` | Template config | admin, management |
| POST | `/documents/generate` | Render invoice/summary (en/ar/bilingual) | finance, reception, doctor |
| POST | `/files` | Upload (lab result, attachment) | role per context | **mime+size validation**, virus scan, tenant bucket |
| GET | `/files/:id` | Signed URL | authorized refs only |

## Demo tools (demo mode only — never in production tenants)

| Method | Path | Purpose | Roles |
|--------|------|---------|-------|
| POST | `/demo/export` | Export state JSON | admin, it |
| POST | `/demo/import` | Import state JSON | admin, it |
| POST | `/demo/reset` | Reset to seed | admin, it |
| POST | `/demo/snapshot` / `/demo/restore` | Snapshot tools | admin, it |

---

## Standard error shape

```json
{ "error": { "code": "FORBIDDEN", "message": "Not permitted", "details": {} } }
```

Codes: `UNAUTHENTICATED`, `FORBIDDEN` (RLS/role), `VALIDATION`, `CONFLICT`
(e.g. duplicate MRN / double-billing), `NOT_FOUND`, `RATE_LIMITED`.
