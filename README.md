# ArogyaFlow — *by Elan Iqbal*

**Connected Hospital Operations Platform**
*Rooted in healing. Built for connected care.*

ArogyaFlow is a connected hospital operations platform inspired by “Arogya,”
the timeless idea of complete health and well-being. It brings together modern
hospital workflows, Ayurveda/Panchakarma care, billing, lab, pharmacy, IPD, OPD,
patient journeys, approvals, reports, and multilingual patient-facing documents
into one smooth workflow.

**Brand hierarchy**

- **Product / software:** ArogyaFlow
- **Creator / developer:** Elan Iqbal
- **Configured client (this build):** Dr. P. Alikutty's Ayurveda & Modern Hospital, Kottakkal
- **Platform type:** Connected Hospital Operations Platform

```
ArogyaFlow
Connected Hospital Operations Platform
Configured for Dr. P. Alikutty's Ayurveda & Modern Hospital
by Elan Iqbal
```

> The hospital remains the configured client/organization. UI/branding direction
> is intentionally preserved from earlier builds — this phase rebranded the
> product and added operations-platform depth (data service layer, tasks,
> approvals, discharge clearance, audit trail, demo tools) underneath it.

---

## Product roadmap (future editions)

- **ArogyaFlow Core** — basic clinic and OPD workflows
- **ArogyaFlow Plus** — OPD, IPD, billing, lab, pharmacy
- **ArogyaFlow Ayurveda** — Panchakarma and integrative care workflows
- **ArogyaFlow Gulf** — Arabic/bilingual GCC-ready edition
- **ArogyaFlow Enterprise** — full hospital operations suite with approvals, audit logs, reports, multilingual documents, analytics, and advanced workflows

---

## Tech stack

- **Vite + React 18** (plain JSX)
- **React Router 6** for routing + per-module route guards
- **Tailwind CSS** for styling (Ayurveda-green + saffron-gold palette)
- **Recharts** for dashboards/reports, **lucide-react** for icons
- **State:** React Context + `useReducer`, behind a **data service layer**
  (repositories + swappable storage adapter), persisted to **localStorage**
  (no backend required for the demo)

---

## Install & run

```bash
npm install
npm run dev          # open the printed localhost URL
npm run build        # production build
```

> **Windows / PowerShell note:** if `npm` is blocked by execution policy, use
> `cmd.exe`, run `npm.cmd run dev`, or run once:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

The network is not required at runtime — all data is seeded locally.

---

## Demo credentials

All accounts use the pattern shown. Log in at `/login`.

| Role                     | Email                       | Password      |
|--------------------------|-----------------------------|---------------|
| System Administrator     | admin@palikutty.in          | admin123      |
| Management               | management@palikutty.in     | manage123     |
| Doctor / Consultant      | doctor@palikutty.in         | doctor123     |
| Doctor (Allopathy)       | reema@palikutty.in          | doctor123     |
| **Nurse**                | nurse@palikutty.in          | nurse123      |
| Reception                | reception@palikutty.in      | reception123  |
| Pharmacy                 | pharmacy@palikutty.in       | pharma123     |
| Lab / Diagnostics        | lab@palikutty.in            | lab123        |
| Finance / Billing        | finance@palikutty.in        | finance123    |
| IT / System Admin        | it@palikutty.in             | it123         |

---

## Working modules

Dashboard · Patients · Appointments · Consultations · **IPD & Beds** ·
**Nursing & Vitals** · **Panchakarma** · Pharmacy · Lab · Billing & Finance ·
**Tasks & Alerts** · **Approval Center** · **Audit Log** · Reports · Settings.

Each role sees only its permitted modules (sidebar is filtered, routes are
guarded, and restricted actions are hidden/disabled). Opening a restricted
route directly shows a clean **Access restricted** screen.

---

## Data service layer / backend-readiness

Data access is layered so the UI never talks to `localStorage` directly:

- **`services/storageAdapter.js`** — the only module that talks to a persistence
  backend. It exposes `read() / write() / clear()`. Swap it for an
  HTTP/Supabase/Firebase adapter with the same shape and nothing else changes.
- **`services/repositories.js`** — named, per-domain CRUD (`repos.patients.create`,
  `repos.tasks.complete`, …) over the store's dispatch primitives, so components
  speak in domain verbs instead of scattering raw collection writes.
- **`store/reducer.js` + `store/HospitalContext.jsx`** — the store remains the
  single owner of state; persistence flows through the adapter on every change.
  Composite actions (`admitPatient`, `convertToIpd`, `transferBed`,
  `dischargePatient`, `clearGate`, `overrideDischarge`) model the transactions a
  backend endpoint would own.

State key is `arogyaflow-state-v3`, with one-time migration from older keys and
defensive back-filling of any newly added collections.

---

## Tasks & notifications

Cross-department work queue (`services/workflow.js` + `pages/Tasks.jsx`). Tasks
carry id, type, priority, MRN, source role, assigned role, status
(Pending / In Progress / Completed / Cancelled), creator, timestamps, related
record and notes. Example connected flow seeded + wired: a doctor requesting a
lab test creates a **pending Lab task** and an audit entry; the Tasks page lets
the assigned department start/complete work. Other routes (pharmacy dispense,
discount approval, low stock, discharge clearances) use the same task model.

---

## Approval Center

`pages/Approvals.jsx` — discounts, charge waivers, manual invoice edits, price
changes, refunds, discharge financial clearance and high-value invoice review.
Only **Administrator, Management and Finance** can approve/reject; other roles
submit and track requests and **cannot decide their own request**. Each decision
is written to the **audit log** with remarks.

---

## IPD discharge clearance workflow

`services/discharge.js` + the discharge modal in `pages/IPD.jsx` implement a
multi-gate pipeline that keeps **medical** discharge separate from **financial**
discharge:

1. Clinical discharge (Doctor) → 2. Nursing clearance → 3. Pharmacy clearance →
4. Lab clearance → 5. Finance billing clearance → 6. Discharge documents
(Reception) → patient discharged → bed → Cleaning → Available.

A live progress tracker shows each gate. **Final discharge is blocked until all
required gates pass**, unless an **Admin/Management override** is recorded with a
reason (audited). Status is derived from the gate state (Active IPD → … →
Financially cleared → Discharged).

---

## Audit trail

`pages/Audit.jsx` — filterable log of sensitive events (lab requests, approvals,
discharge gates/override, demo export/import/reset/snapshot, status changes…).
Each entry records id, user, role, action, module, related record, MRN,
old → new value, timestamp, remarks and severity. Visible to
Administrator/Management/IT; Finance sees finance-related entries
(billing/approvals/pricing). Exportable to CSV.

---

## Demo data backup / snapshot tools

Settings → **Demo Data** (Admin/IT) provides: **Export** full state as JSON,
**Import** from JSON, **Create snapshot**, **Restore snapshot**, and **Reset to
seed**. Designed for presentations — snapshot before a demo, restore after.
Every export/import/reset/snapshot/restore is audited.

---

## Pricing master & department-linked billing

`pricing` (seeded) holds official rates editable only by
Admin/Management/Finance. `billableItems` represents services rendered but not
yet on a final invoice. Doctors can trigger charges and **request** discounts
(routed to the Approval Center) but cannot edit official fees, approve discounts,
or finalize invoices — Finance does that, applying approved discounts + GST.

---

## Role-based access (RBAC)

Defined in `src/config/roles.js` — a single source of truth driving the
sidebar, route guards, and action buttons.

- **Admin** — full access (`*`).
- **Management** — dashboards, reports, occupancy, dues (read-only clinical).
- **Doctor** — patients, consultations, prescriptions, IPD clinical notes,
  therapy plans, lab; can convert OPD→IPD.
- **Nurse** — assigned inpatients, vitals, nursing notes, medication status,
  doctor instructions. No finance/admin, cannot edit prescriptions or delete
  patients.
- **Reception** — registration, appointments, admissions, OPD→IPD conversion,
  basic billing.
- **Pharmacy** — stock + dispensing only.
- **Lab** — test requests/results only.
- **Finance** — invoices, payments, discounts, GST, dues, reports.
- **IT** — settings + user/role configuration.

The Settings → *Roles & Permissions* tab renders every role's modules and
capabilities live from this config.

---

## OPD / IPD data model (same MRN)

One **master patient** record holds a single unique `MRN`. Visits and
admissions are stored as **episodes** linked to that patient:

- OPD visit → `OPD-0007-01`
- IPD admission → `IPD-0007-01`

A patient can have many OPD visits and IPD admissions **without ever being
duplicated**. The Patients table can filter by **OPD / Active IPD / OPD→IPD /
Discharged**, and each patient profile has tabs: Overview, Visits & Admissions,
**Timeline**, and Billing.

## OPD → IPD conversion

From a patient profile (or the Patients row action) → **Convert to IPD**:
pick the OPD visit to link, a free bed, admitting doctor, nurse, dates,
diagnosis, reason and advance. On confirm:

- the **same MRN is retained** (no new patient),
- a new IPD episode is created (`convertedFrom` records the OPD episode),
- the chosen bed becomes **Occupied**,
- the patient shows **Active IPD**, appears in IPD & Nursing, and the event is
  added to the **timeline** and **dashboard/report** counters.

## IPD & bed management

`IPD & Beds` shows a ward-grouped bed board (Available / Occupied / Cleaning /
Maintenance / Reserved) with occupancy KPIs, plus **Admit**, **Transfer bed**
(records transfer history), and **Discharge** flows. Wards seeded: Ayurveda
Ward, General Medicine Ward, Panchakarma Recovery, Deluxe Rooms, Semi-private
Rooms, Observation Beds.

## Nursing & vitals

`Nursing & Vitals` lists active inpatients; for each you can record **vitals**
(temp, BP, pulse, SpO₂, resp, sugar, notes), add **nursing notes**, and set
**medication administration status** (pending / given / skipped / delayed).
Latest doctor instructions are shown to the nurse.

## Panchakarma / Ayurveda therapy

`Panchakarma` schedules therapy sessions (Abhyanga, Shirodhara, Pizhichil,
Njavarakizhi, Virechana, Basti, Nasya, Kizhi, Kati Basti, follow-up) with
status, therapist, cost and Arabic patient instructions. Therapy appears in the
patient timeline and feeds therapy-revenue reporting.

---

## Billing — discount & GST

`src/lib/billing.js` centralises the maths; the bill form shows a **live
breakdown**. Discount is applied **before** GST.

**Percentage example**

```
Subtotal:         ₹10,000
Discount (10%):   −₹1,000
Taxable amount:    ₹9,000
GST (5%):           ₹450
Grand Total:       ₹9,450
```

**Fixed example**

```
Subtotal:         ₹10,000
Discount:           −₹500
Taxable amount:    ₹9,500
GST (5%):           ₹475
Grand Total:       ₹9,975
```

Bills support OPD / IPD / Pharmacy / Lab / Panchakarma types, an OPD/IPD
reference, payment status (Paid / Partial / Pending / Cancelled), paid amount,
balance due and payment method. Bills appear in the patient timeline.

---

## Arabic / bilingual documents

Translation labels live in `src/config/i18n.js` (`DICT`, `t()`, `tb()`) so
strings are structured, not hardcoded — real translations can be slotted in
later. Patients carry a **preferred language** (English / Arabic / Bilingual)
plus optional **Arabic name**, **Arabic diagnosis** and **Arabic treatment**
fields.

The **printable invoice** (`src/lib/printDocument.js`) renders in:

- **English**
- **Arabic** — full RTL layout, Arabic labels
- **Bilingual** — English + Arabic label pairs

Open any invoice → choose the print language → **Print / PDF** (uses the
browser's print-to-PDF). Arabic/bilingual documents include a visible note that
the Arabic text is a demo helper translation and should be staff-reviewed.

---

## Printable invoice / report layout

The invoice is a self-contained, print-friendly HTML document with hospital
logo, name (EN/AR), address, invoice metadata, itemised table, full
discount/GST/total breakdown, payment status, and an authorised-signature
placeholder. Print CSS handles margins and page setup.

### Replacing the logo

The print document currently embeds an inline SVG leaf mark (`LOGO_SVG` in
`src/lib/printDocument.js`) so printing works offline. To use the real logo:

1. Drop the file at `public/logo.png`.
2. In `printDocument.js`, replace the `LOGO_SVG` constant with
   `const LOGO_SVG = '<img src="/logo.png" width="54" height="54" alt="logo" />'`.

The on-screen app brand mark lives in `public/leaf.svg` / `src/components/layout/Brand.jsx`.

---

## Reports & exports

`Reports` has a date-range filter, KPI cards (revenue, dues, active IPD, bed
occupancy %, OPD→IPD conversions, discharged, therapy done, low stock, lab
pending), charts (revenue & patients by department, pharmacy stock mix, patient
mix), and **CSV exports** for Patients, Billing (with discount/GST/paid/balance),
Appointments, IPD Records, and Panchakarma. CSVs include a UTF-8 BOM so Arabic
and Excel render correctly, and are date-stamped.

---

## Demo scenarios (seeded)

1. **OPD lifecycle** — Mohammed Ashraf: appointment → consultation →
   prescription (dispensed) → paid GST invoice.
2. **IPD stay** — Krishnan Nair admitted (General Medicine), vitals + nursing
   notes recorded, partial discounted invoice.
3. **OPD→IPD conversion** — Krishnan Nair's IPD episode is `convertedFrom` his
   OPD visit, same MRN `MRN-0004`.
4. **Panchakarma** — Abdul Rahman Al Balushi (Arabic), residential 14-day
   protocol with Abhyanga/Kizhi/Kati Basti sessions and an IPD therapy invoice.
5. **Management** — dashboard + reports show occupancy, dept revenue, dues; CSV
   export works.
6. **Arabic patient** — Abdul Rahman / Fathima Beevi: Arabic & bilingual
   invoices, Arabic diagnosis/treatment fields.
7. **Access restricted** — log in as Lab/Pharmacy and open `/billing` or
   `/settings` to see the restricted screen.

Also seeded: a discharged IPD patient **with bed-transfer history**
(Fathima Beevi), repeat-OPD patient (Aishwarya Pillai), and paid/partial/pending
invoices including percentage and fixed discounts.

---

## Persistence & resetting the demo

State is saved to `localStorage` under `arogyaflow-state-v3`, so new
records survive a refresh. To restore the original seed data:

- **Settings → Hospital Profile → Reset demo data**, or
- clear the `arogyaflow-state-v3` key in your browser's devtools.

---

## SaaS product direction (planning docs)

ArogyaFlow is moving from a localStorage demo toward a real, secure, multi-tenant
SaaS product. The architecture for that migration is documented under [`docs/`](docs/):

- **[`BACKEND_ROADMAP.md`](docs/BACKEND_ROADMAP.md)** — recommended stack
  (**Supabase / PostgreSQL**, with rationale vs. Firebase / Nest / Django) and a
  safe, staged migration path that swaps only the `storageAdapter` layer.
- **[`DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md)** — full Postgres schema draft:
  organizations, users/memberships, patients, episodes, lab, pharmacy, billing,
  tasks, approvals, audit, documents — every major table carries
  `organization_id` + standard audit columns.
- **[`API_CONTRACT.md`](docs/API_CONTRACT.md)** — logical endpoint contract with
  method, path, purpose, allowed roles, validation, and audit requirements.
- **[`SECURITY.md`](docs/SECURITY.md)** — authentication (Supabase Auth, MFA,
  invite-only), three-layer authorization (tenant → role → department/ownership),
  server-enforced workflow invariants, file/transport hardening, secrets, audit
  and backups. **Core principle: frontend restrictions are UX; the database (RLS)
  is the real boundary.**
- **[`MULTI_TENANT.md`](docs/MULTI_TENANT.md)** — shared-DB + row-level isolation,
  per-org branding/pricing/templates, multi-org users.
- **[`DEPLOYMENT.md`](docs/DEPLOYMENT.md)** — topology, environments, rollout,
  backup/recovery, CI/CD.

### Task visibility & department isolation (rules the frontend implements)

These rules are specified in `SECURITY.md` and enforced (server-side) via RLS in
the target backend; the frontend implements the same logic in its data selectors
and route/action guards:

- A task is visible only to its **assigned user**, its **assigned
  department/role**, and **Admin/Management**. Other departments cannot see it —
  not just hidden in the UI, but filtered at the data/action layer.
- Department data isolation: Lab sees lab work; Pharmacy sees dispensing; Nurse
  sees assigned IPD patients; Finance sees billing references (not clinical
  notes); Management is read-only across departments; Admin is full; IT is
  technical/settings only.
- **Lab is the reference workflow**: doctor requests → only Lab sees the task →
  Lab accepts/collects/results → result flows back to the doctor, patient
  timeline, and a billable item — automatically, without the doctor searching.

---

## Known limitations / deferred

This phase prioritised: **rebrand → data service layer → tasks → approvals →
discharge clearance → audit trail → demo tools**, per the brief. Built on a
solid foundation, the following are **partial or deferred** and called out
honestly:

- **Task auto-generation is wired for the highest-value flows** (lab request →
  Lab task + audit) and fully seeded for the rest (pharmacy dispense, discount
  approval, low stock, clearances). Remaining generators (e.g. auto-task on every
  prescription, critical-lab auto-alert) reuse the same `createTask` helper and
  are quick to add.
- **Pharmacy/Lab depth (Priorities 7–8)** — batch/expiry/supplier/stock-movement
  and full lab sample-status lifecycle are **not yet** built out beyond existing
  fields. Models are ready to extend.
- **OPD appointment queue (Priority 6)** — richer statuses/token queue **not yet**
  added; appointments still use the prior status set.
- **Document template settings (Priority 9)** and **expanded reports
  (Priority 12)** — **not yet** built; the print pipeline and Reports page are the
  insertion points.
- **Printable-document suite** beyond invoice; **full Arabic** for every doc type;
  **per-card dashboard date filtering** — still deferred from the prior phase.
- **No real build was run in this environment** (offline sandbox, no
  `node_modules`). Validation was done by Node syntax checks, a JSX balance
  checker, and a static import-resolution verifier (all local imports resolve to
  real exports). **Run `npm install && npm run build` locally to confirm.**
- Arabic strings remain **demo helper translations** — staff-review before
  clinical use.

## Recommended next phase

1. Run `npm run build` locally; address any warnings (this couldn't be done in
   the offline build environment).
2. Finish task auto-generation across all clinical actions and add the OPD queue
   (Priority 6) using the existing task model.
3. Build Pharmacy/Lab operational depth (Priorities 7–8): batches, expiry,
   stock movement, sample lifecycle.
4. Add document template settings (Priority 9) and the expanded operational
   reports (Priority 12: pending tasks, approvals, discharge pipeline, audit).
5. Swap the localStorage adapter for a real backend — the `storageAdapter` +
   `repositories` boundary is built precisely for this.
