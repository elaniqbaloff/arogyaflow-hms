# ArogyaFlow — Database Schema Draft

*Target: PostgreSQL (Supabase). Draft for backend migration — not yet live.*

## Conventions

Every major table carries these **standard columns** (omitted from the per-table
lists below for brevity, assume present unless noted):

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | `default gen_random_uuid()` |
| `organization_id` | `uuid` FK → organizations | **tenant key — on every major table** |
| `created_at` | `timestamptz` | `default now()` |
| `updated_at` | `timestamptz` | trigger-maintained |
| `created_by` | `uuid` FK → users | |
| `updated_by` | `uuid` FK → users | |
| `status` | `text` | where relevant |

All tenant tables have **RLS enabled** with a baseline policy:
`organization_id = auth.jwt() ->> 'organization_id'` plus role/department
refinements (see `SECURITY.md`).

---

## Tenancy & identity

**organizations** (the tenant / hospital)
`name, name_ar, slug, logo_url, address, address_ar, phone, email, timezone,
locale_default, branding (jsonb), plan, is_active`
— *no `organization_id` on this table; it **is** the tenant root.*

**users** (auth identity; mirrors Supabase `auth.users`)
`auth_user_id, email, full_name, full_name_ar, is_active, last_login_at`
— a user may belong to multiple orgs via `memberships`.

**memberships** (user ↔ organization ↔ role)
`user_id, organization_id, role, department, is_active`
— enables one person working at multiple hospitals with different roles.

**roles** `key, label, description, is_system`
**permissions** `key, label, module`
**role_permissions** `role_key, permission_key`
— roles/permissions can be global or org-scoped (`organization_id` nullable;
null = system default).

**departments** `name, type, head_user_id, is_active`
**staff_profiles** `user_id, department, designation, license_no, signature_url`

---

## Patients & visits

**patients**
`mrn (unique per org), full_name, full_name_ar, dob, age, gender, phone,
address, blood_group, allergies, preferred_language, diagnosis_ar,
treatment_ar, primary_department`
— **unique constraint:** `(organization_id, mrn)`.

**patient_contacts** `patient_id, relation, name, phone, is_emergency`

**episodes** (OPD visits + IPD admissions — one MRN, many episodes)
`patient_id, type ('OPD'|'IPD'), ref_no, department, doctor_id, nurse_id,
reason, diagnosis, bed_id, ward, admit_date, expected_discharge, discharge_date,
advance, converted_from (episode_id), clearance (jsonb), status`

**appointments**
`patient_id, doctor_id, department, scheduled_at, reason, token_no, status`

**queue_tokens** `appointment_id, patient_id, token_no, department, state,
called_at, started_at, finished_at`

---

## Clinical

**consultations**
`patient_id, episode_id, doctor_id, date, notes, diagnosis, treatment, status`

**prescriptions** `patient_id, consultation_id, doctor_id, status`
**prescription_items** `prescription_id, medicine_id, name, dosage, qty`

**ipd_admissions** — modelled as `episodes` where `type='IPD'` (above).
**wards** `name, type, capacity`
**beds** `ward, room, bed_no, status, patient_id, episode_id`
**bed_transfers** `episode_id, from_bed_id, to_bed_id, from_ward, to_ward,
reason, transferred_by, at`

**vitals** `patient_id, episode_id, nurse_id, recorded_at, temp, bp, pulse,
spo2, resp, sugar, notes`
**nursing_notes** `patient_id, episode_id, nurse_id, date, note, medication,
med_status`

---

## Lab (reference workflow)

**lab_requests**
`patient_id, episode_id, doctor_id, test_name, test_code, department,
priority, clinical_note, status, requested_at`

**lab_samples**
`lab_request_id, sample_id, collected_by, collected_at, received_by,
received_at, state`

**lab_results**
`lab_request_id, result_value, result_remarks, is_critical, entered_by,
entered_at, verified_by, verified_at, report_url, shared_at`
— lab task cannot reach `Completed` without a `lab_results` row (enforced
server-side; see `SECURITY.md`).

---

## Pharmacy

**pharmacy_inventory** (medicine master)
`name, category, unit, reorder_level, selling_price, purchase_price, supplier`
**medicine_batches**
`medicine_id, batch_no, expiry_date, quantity, purchase_price, supplier,
received_at`
**stock_movements**
`medicine_id, batch_id, kind ('added'|'dispensed'|'adjusted'|'expired'|'returned'),
qty, reason, ref_type, ref_id, by_user, at`
**dispenses** `prescription_id, patient_id, dispensed_by, at, billable_item_id`

---

## Ayurveda / Panchakarma

**therapies** (therapy plan/session)
`patient_id, episode_id, type, therapist_id, scheduled_at, status, cost,
notes, instructions_ar`

---

## Billing & finance

**pricing_master**
`code, name, department, amount, taxable, is_active`
— editable only by admin/management/finance.

**billable_items** (service rendered, not yet invoiced)
`patient_id, episode_id, department, description, price_id, amount, source,
status ('pending'|'invoiced'|'waived'), invoice_id`

**invoices**
`patient_id, episode_id, invoice_no, bill_type, department, doctor_id, date,
discount_type, discount_value, gst_rate, paid_amount, payment_method,
payment_status, total`

**invoice_items** `invoice_id, description, qty, rate, amount, billable_item_id`
**payments** `invoice_id, amount, method, received_by, at, reference`

**discount_requests** `invoice_id, patient_id, amount, percent, requested_by,
requested_role, reason, status, decided_by, decided_at, remarks`

**approvals**
`type, type_label, mrn, patient_id, amount, requested_by, requested_role,
requested_at, reason, status, decided_by, decided_role, decided_at, remarks,
related_type, related_id`

---

## Workflow plumbing

**tasks**
`title, description, type, priority, patient_id, mrn, related_module,
related_id, source_department, source_role, created_by_user, created_by_role,
assigned_department, assigned_role, assigned_user_id, status, accepted_by,
started_by, completed_by, accepted_at, started_at, completed_at, due_at,
notes, result_ref, visible_to (text[])`

**notifications**
`user_id, role, department, type, title, body, ref_type, ref_id, is_read,
created_at`

**audit_logs**
`actor_user, actor_role, action, module, record_type, record_id, patient_mrn,
old_value (jsonb), new_value (jsonb), remarks, severity, at`
— **append-only**; no update/delete policy granted to any role.

---

## Documents & files

**document_templates**
`kind, name, language ('en'|'ar'|'bilingual'), header, footer, logo_placement,
signature_placeholder, body (jsonb), is_active`

**generated_documents**
`kind, patient_id, ref_type, ref_id, language, file_url, generated_by,
generated_at`

**files** (generic attachments)
`bucket, path, mime, size, ref_type, ref_id, uploaded_by, uploaded_at`

---

## Key relationships (summary)

```
organizations 1───* memberships *───1 users
patients 1───* episodes 1───* consultations 1───* prescriptions 1───* items
episodes 1───* lab_requests 1───1 lab_results
episodes 1───* billable_items *───1 invoices 1───* payments
tasks *───1 (assigned_department | assigned_user)   [RLS-filtered]
everything ───1 organizations                        [tenant isolation]
```

## Indexing notes

- `(organization_id, mrn)` unique on patients.
- `(organization_id, assigned_department, status)` on tasks (queue queries).
- `(organization_id, patient_id)` on episodes/consultations/invoices.
- `(organization_id, at desc)` on audit_logs.
- partial index on `billable_items (status) where status='pending'`.
