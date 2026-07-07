# ArogyaFlow Product Blueprint & Implementation Roadmap

**Product:** ArogyaFlow — Connected Hospital Operations Platform
**Client:** Dr. P. Alikutty's Ayurveda & Modern Hospital, Kottakkal (NABH accredited)
**Prepared:** July 2026 · Based on codebase `palikutty-hms` (branch `audit-and-ui-foundation`), the Codex audit, public hospital website research, and public HMS product research.
**Revision v1.1:** adds §8 — **Clinical Smart Assist (doctor autocomplete)** — woven through the UI blueprint (§4.13), Department Engine (§5.8), RBAC (§6.7), dental (§9.12) and physio (§10.11) plans, the roadmap (Phase 2.5), three new coding prompts (11–13), and a new 30-Day V1 Build Plan (§14).

> **Naming correction:** The dental unit is publicly named **ALIDS — Alikutty's Laser Implants & Dental Speciality** (alids.in). The earlier prompt's "ALEDS" appears to be a typo. This document uses **ALIDS** throughout.

---

## Executive Summary

ArogyaFlow already has an unusually strong prototype foundation: 16 working modules, a single-MRN patient/episode model, reducer-driven state with a swappable storage adapter, a repository layer, module+capability RBAC, department-aware consultation templates (Ayurveda vs. common), bilingual branding, and seeded data for all 11 real hospital departments — including Dental and Physiotherapy. The verified build/dev/login pipeline works.

What it is **not** yet is department-safe. Tasks are routed by role only, anyone with `tasks.update` can complete any visible task (confirmed in `Tasks.jsx` — `isManager` is computed but never used), there is no `assignedDepartment`/`assignedUserId`/ownership locking, RBAC has no row-level or department-level predicates, and two Phase-0 bugs undermine trust: login authenticates against seed users instead of `state.users` (so Settings user management is cosmetic), and patient delete orphans episodes, bills, and labs.

The strategy this document recommends, in one sentence: **fix the two trust bugs, then build the Department + Task Ownership foundation, then polish the UI, and only then grow Dental/ALIDS and Physiotherapy as department configurations on top of the shared patient record — never as separate apps.**

This mirrors what the mature systems do well. InterSystems TrakCare's core idea is a single patient record shared by every care setting, with departmental products layered on top of one data model, and worklist/search-driven navigation for clinicians. Practo Insta's useful ideas are configurable consultation forms, pending-work dashboards, treatment packages, and simple ADT/bed workflows — its warning is scope bloat (linen, contracts, asset maintenance) that ArogyaFlow should deliberately refuse. The dental industry pattern worth adopting is the odontogram + phased treatment plan + consent trail; the physiotherapy pattern is referral → assessment (SOAP + outcome measures) → session package → progress → outcome. All of these fit naturally onto ArogyaFlow's existing patients/episodes/tasks/billing spine.

**Added in v1.1 — Clinical Smart Assist (§8).** Doctors should not retype clinical vocabulary all day. Every clinical text field becomes a SmartField: after 2–3 keystrokes it suggests curated, department-aware terms (Abhyanga, Shirodhara, Hypertension, Root Canal Treatment, Range of Motion), medicines and lab tests pulled live from the existing masters, and reusable plan templates — inserted only when the doctor explicitly selects them, never auto-diagnosing or auto-prescribing. It ships as roadmap Phase 2.5 with a static curated dictionary, becomes department-aware with the Department Engine, and grows into doctor-managed templates/order sets alongside the dental and physiotherapy modules.

**Top 5 immediate actions**

1. Fix `AuthContext` to authenticate against `state.users` (Phase 0 — currently Settings user management silently does nothing at login).
2. Replace hard patient delete with archive + related-record guard (Phase 0).
3. Extend the task model with `assignedDepartment`, `assignedUserId`, `acceptedBy/At`, `startedAt`, `completedAt`, `blockedReason` + a lock-safe accept/start/complete lifecycle (Phase 1).
4. Add a central `taskPolicy`/`scope` layer so visibility and action rights are computed in one place, not per-page (Phase 1).
5. Introduce the department config model (`code`, `category`, `appointmentTypes`, `worklistTypes`, template binding) that Dental/ALIDS, Physio, and every future department will plug into (Phase 3).

---

## 1. Executive Product Vision

### What ArogyaFlow should become

**ArogyaFlow is the operational nervous system of one specific kind of hospital: an integrative Ayurveda + modern medicine hospital, where a single patient may move between an Ayurveda physician, Panchakarma therapists, a dentist at ALIDS, a physiotherapist, the lab, the pharmacy, and IPD — all in one visit cycle, under one MRN, one bill trail, and one management view.**

Generic HMS platforms treat Ayurveda as an afterthought and integrative journeys as edge cases. ArogyaFlow inverts that: the integrative patient journey *is* the core product.

### The six product pillars

1. **One patient, one MRN, many departments.** Every department reads and writes the same master patient record and episode chain. Dental and Physio are *views over shared data*, never silos. (This is the TrakCare "unified patient record" idea, implemented at prototype scale.)
2. **Work moves as owned tasks, not verbal messages.** Every cross-department handoff (lab order, prescription, therapy session, discharge clearance, dental follow-up) is a task with a department, a role, an explicit owner, and a locked lifecycle. Nothing is "someone's job"; everything is *someone's* job.
3. **Departments are configuration, not code.** A department = a config record (category, appointment types, consultation template, worklist types, pricing group, dashboard tiles). Adding "Audiology & Speech" should mean adding config + a few templates, not new pages.
4. **Premium but practical UI.** Ayurveda green/gold/cream, calm density, big touch targets, worklist-first screens. Staff at a real Kerala hospital — including non-technical therapists and reception — must succeed on day one without training manuals.
5. **Management sees the whole hospital breathing.** Load, revenue, delays, bottlenecks, and pending approvals in one command center — with drill-down to the underlying records and audit trail.
6. **Doctors type less, document more.** Every clinical field offers curated, department-aware suggestions after 2–3 keystrokes — Ayurveda terms, Panchakarma therapies, diagnoses, medicines, lab tests, dental procedures, physio phrases, and saved templates — always doctor-confirmed, never machine-diagnosed (§8).

### What makes it different from a generic HMS

| Generic HMS | ArogyaFlow |
|---|---|
| Ayurveda bolted on as "alternative medicine" notes | Classical Ayurveda assessment (prakriti, vikriti, samprapti, chikitsa sutra, pathya-apathya) is a first-class, mandatory-field consultation template — already built |
| Departments = menu items | Departments = configurable engines with their own worklists, templates, and dashboards |
| Tasks = a notification list | Tasks = owned, locked, auditable units of work with department + user ownership |
| 300 features, 30 used | Deliberately small surface, deep on the hospital's real workflows |
| English-only or heavy localization projects | Bilingual EN/AR patient documents built in (Gulf/Majlis patient base is a real, confirmed audience for this hospital) |
| Sold to everyone | Configured for Dr. P. Alikutty's first; productized later via the existing `BRAND` config and roadmap tiers |

### What ArogyaFlow deliberately refuses to become

- No ERP creep: no linen management, asset maintenance, HR/payroll, contract registers (Insta offers these; that is exactly the bloat to avoid).
- No insurance claims engine in the prototype phase (design billing so claims can attach later).
- No separate dental app, physio app, or patient app codebases — one platform, role/department-scoped views.
- No premature backend: keep the storage adapter boundary clean so localStorage → API is a swap, not a rewrite.

---

## 2. Hospital Website Service Taxonomy

**Source discipline:** Everything in "Confirmed public information" below comes from drpalikuttysayurveda.com and other public listings (links in Sources). Everything in "Recommendation" columns/notes is product judgment. Anything about *internal* operations that is not public is explicitly marked **(assumption)**.

### 2.1 Confirmed public information

**Identity & accreditation**
- NABH-accredited hospital; "Holistic Healing Where Ayurveda Meets Modern Medicine"; 61-year legacy from a 1960s clinic; Kottakkal, Malappuram, Kerala (NH-66, Changuvetty).
- In-house medicine manufacturing: Dr. P. Alikutty's Ayurveda Pharmaceuticals / Kottakkal Ayurveda Pharmacy (classical + proprietary formulations; separate site drpalikuttyspharma.com).
- Website is bilingual English/Arabic; dedicated **Majlis** area facility and an international patient care phone line — a clear GCC/Arab patient audience. This validates ArogyaFlow's existing bilingual document direction.

**Departments (website navigation, all 10):** Ayurveda, Allopathy, Dental, Physiotherapy, Occupational Therapy, Audiology and Speech, Yoga & Fitness, Ayur Beauty Clinic, Diet & Nutrition, Diagnostics. (ArogyaFlow's seed adds Panchakarma as an 11th internal department — reasonable, since the website markets Panchakarma heavily as a treatment family and facility.)

**Dental (ALIDS):** Publicly described services: checkups, cleaning, fillings, root canals, extractions, crowns, bridges, implants, whitening; patient education/counseling. ALIDS — "Alikutty's Laser Implants & Dental Speciality" — is presented as a fully equipped modern dental hospital within the group.

**Specialization lines (condition-oriented marketing):** Neurological disorders, Gastric disorders, Women's health, Mental health, Bone & muscle care, Skin care, Lifestyle disorders, Child development.

**Treatments (Panchakarma/Ayurveda therapy catalog on the site):** Abhyanga, Swedana, Udwarthana, Kizhi, Dhanyamla Kizhi, Shirovasti, Shirodhara, Kati Basti, Janu Basti, Greeva Basti, Pizhichil, Avagaha Sweda, Tharpana, Marma Chikitsa, Rasa Chikitsa, Rasayana Chikitsa, Vajeekarana Chikitsa.

**Facilities:** Reception & Registration; Out-Patient Department (private consultation rooms per specialty); In-Patient Department (capacity up to ~150 patients); Pharmacy (Ayurveda & Modern); Panchakarma Suites (separate male/female, therapist-operated); Minor OT / Emergency care; Laboratory ("integrates Ayurvedic assessments with modern medical" diagnostics); Diet & Nutrition (cafeteria with supervised diet food); Majlis lounge.

**Patient touchpoints (public):** phone booking (+91 85471 12478), "Request a callback" form (asks which condition line), WhatsApp online consultation link, international patient care line, branches page, courses page, health-reads blog. Payments accepted: cash, credit/debit card, online payment, medical reimbursement facility.

### 2.2 Taxonomy → product mapping

| Website concept | Becomes a **module**? | Becomes **department config**? | Notes |
|---|---|---|---|
| Ayurveda, Allopathy | No new module | ✅ Department configs on existing Consultations/Appointments | Already working via consultation templates |
| Panchakarma + treatment catalog | Existing Therapy module | ✅ Treatment catalog = department service list + pricing items | Map the 17 public treatments into `pricing`/services master |
| Dental (ALIDS) | **Phase 5 module surfaces** (dental worklist, chart) | ✅ Department config first | Same MRN/appointments/billing; dental-specific consultation template + procedure plan |
| Physiotherapy | **Phase 6 module surfaces** (referrals, sessions) | ✅ Department config first | Session/package model reused by OT, Audiology, Yoga |
| Occupational Therapy, Audiology & Speech | No | ✅ Config on the physio/allied engine | Same referral→assessment→sessions pattern |
| Yoga & Fitness, Ayur Beauty, Diet & Nutrition | No | ✅ Config (wellness category) | Appointment types + packages + simple notes; Diet gets a referral worklist |
| Diagnostics | Existing Lab module | ✅ Config + Phase 7 upgrade | Panels, sample states, critical-result tasks |
| Pharmacy (Ayurveda & Modern) | Existing Pharmacy module | ✅ Two stock categories (classical/modern) **(assumption)** | In-house KAP formulations suggest a "classical preparations" catalog flag |
| IPD (~150 capacity), Panchakarma suites | Existing IPD module | ✅ Ward/suite types incl. gender-separated therapy suites | Suite scheduling belongs to Therapy, beds to IPD |
| Minor OT / Emergency | **Not now** | Later: an episode type + worklist | Avoid building an OT/ER module prematurely; record as episode type **(assumption on internal volume)** |
| Reception/Registration, callback, WhatsApp | Existing Patients/Appointments | ✅ Lead/enquiry inbox is a *future* config, not a CRM module | A tiny "Enquiries" queue for reception could mirror the callback form later |
| Condition specializations (8 lines) | No | ✅ Tag list on patients/episodes | Powers management reporting by condition line |
| Courses, Health Reads, Branches | Out of scope | — | Marketing site concerns; multi-branch = far-future `facilityId` field, don't build now |
| Majlis / international patients | No | ✅ Patient attributes: preferredLanguage (exists), nationality, international flag | Drives bilingual documents and Majlis-related service items |

### 2.3 Patient journey touchpoints (public + assumption)

Public: enquiry (call/callback/WhatsApp) → registration at reception → OPD consultation → (treatments/therapy, lab, pharmacy) → possible IPD admission → discharge → follow-up. **(Assumption:** internal sequencing details, e.g., whether billing precedes dispensing, are not public and must be confirmed with hospital staff before hard-coding rules.)

This journey is exactly the spine of the Patient Journey Tracker in §11.

---
## 3. TrakCare / Insta Inspiration Map

**Rule applied:** ideas only, from public marketing/documentation pages. No UI, code, branding, or proprietary content is copied. Each row: what the mature system does → should ArogyaFlow adopt it → how to do it simply → what to avoid copying.

### 3.1 InterSystems TrakCare (public capabilities)

TrakCare is a unified EHR/healthcare information system: a single patient record and shared administrative core across all care settings, one UI/codebase/data platform, modular "Core + extensions" deployment for departmental products, tightly linked revenue cycle management, a search-based navigation tool (TrakCare Assistant), and a mobile-first web UI. It is the system Medcare (UAE) deployed group-wide. That pedigree is why it's the right "north star" for architecture ideas — not for feature volume.

| # | TrakCare idea (public) | Adopt? | Simple ArogyaFlow implementation | Avoid copying |
|---|---|---|---|---|
| T1 | Single unified patient record across all settings | ✅ Already core | Keep the one-MRN patients/episodes model as the non-negotiable law; every new module reads/writes it | Their data model specifics, EMPI product |
| T2 | Core + departmental extensions on one data model | ✅ Yes | The Department Engine (§5): shared collections + per-department config; no per-department databases | Their module packaging/licensing structure |
| T3 | Clinician worklists as the primary work surface | ✅ Yes | Department Hub pages (§5.6) driven by task/appointment queries per department | Their screen layouts |
| T4 | Search-first navigation (TrakCare Assistant) | ✅ Simplified | Topbar global search: MRN/name/phone → patient profile; module names → routes. No AI, just fast filtering | The "Assistant" branding, AI claims |
| T5 | RCM tied to clinical workflows | ✅ Already started | Keep `billableItems` auto-created from therapy/nursing/lab events; extend to dental procedures & physio sessions | Full claims/remittance engine |
| T6 | Patient journey / 360° timeline view | ✅ Yes | §11: derive a timeline from existing episodes, consultations, therapies, labs, bills — no new collection needed initially | Longitudinal-record interoperability stack (FHIR etc.) — later |
| T7 | Mobile-first, no-install web UI | ✅ Already true | Keep responsive Tailwind shell; audit dense tables for mobile (Codex flagged Dashboard/Settings) | — |
| T8 | Local-market preconfiguration | ✅ In spirit | ArogyaFlow ships "configured for Dr. P. Alikutty's" via `brand.js`; keep all hospital-specific data in config/seed | — |
| T9 | Patient access (Apple Health Records, portals) | ⏳ Later | Roadmap Phase 10+ "patient portal" role is already in the RBAC matrix as read-only future | Any integration promises now |

### 3.2 Practo Insta (public capabilities)

Insta is a cloud HMS with modules for appointment scheduling (doctor/test/service/surgery/generic resource), registration, ADT + bed management, cash/credit billing with packages, rate/discount management, credit notes and deposits, configurable OP-EMR forms (SOAP, e-prescriptions), a pending-prescriptions dashboard, IP-EMR (notes, MAR), consolidated EMR view, lab/pharmacy/inventory, SMS/2-way patient communication, barcodes/queue management, and a report builder. It also markets treatment **packages** for episodic care — very relevant to Panchakarma and physiotherapy.

| # | Insta idea (public) | Adopt? | Simple ArogyaFlow implementation | Avoid copying |
|---|---|---|---|---|
| I1 | Configurable consultation forms per specialty | ✅ Already built | `consultationTemplates.js` already does Ayurveda vs. common; extend with per-department template keys (dental, physio) | Their form designer UI |
| I2 | "Pending work" dashboards (e.g., pending prescriptions) | ✅ Yes | This is exactly the task/worklist model — pharmacy queue, lab queue, dental follow-ups as filtered task views | — |
| I3 | Treatment packages tied to an episode | ✅ Yes | `packages` on billing: N sessions, price, auto-decrement on session completion (physio/Panchakarma) | Insurance/TPA rate contracts |
| I4 | Appointment types beyond doctor visits (service/resource) | ✅ Yes | Department config lists appointment types (consultation, therapy session, dental procedure, lab sample) | Surgery/OT scheduling engine |
| I5 | ADT + bed view | ✅ Already built | Keep IPD board; add suite/gender attributes for Panchakarma suites | — |
| I6 | Patient communication (SMS reminders) | ⏳ Later | Design appointments with `reminderStatus` field; actual SMS/WhatsApp needs a backend (Phase 10) | Their comms stack |
| I7 | Report builder | ❌ No | Fixed, well-chosen reports + CSV export (already have `csv.js`); a query builder is bloat at this scale | Report-builder UI |
| I8 | ERP breadth: linen, assets, contracts, HR | ❌ No | Explicit non-goal (see §1) | Everything |
| I9 | Multi-center | ❌ Not now | Reserve `facilityId` in new records **(design allowance only)** | Multi-center admin console |

### 3.3 Dental & physiotherapy/allied-health workflow patterns (public industry patterns)

From public dental software (CareStack, iDentalSoft, Dentrix, Asprodental et al.): odontogram/tooth chart with color-coded existing/proposed/completed states, phased treatment plans with cost estimates and patient acceptance, consent capture, perio charting, imaging attached to the chart, recall/re-care reminders, referral tracking. ArogyaFlow adopts: phased procedure plan + simple odontogram (phased approach in §9) + consent flags + follow-up tasks. Avoids: 3D charts, imaging device integration, insurance claim logic.

From public physio software (WebPT, PtEverywhere, Medbus, +Physio et al.): SOAP documentation, body charts, standardized outcome measures (VAS/NPRS pain, ROM degrees, LEFS/ODI/NDI scores), session packages with automatic balance deduction, home exercise programs, referral communication, progress graphs, therapist productivity views. ArogyaFlow adopts: assessment template (SOAP-shaped), pain/ROM/outcome fields as structured numbers, session packages, therapist worklist, progress notes per session, outcome summary at discharge. Avoids: HEP video libraries, telehealth, payer-compliance tooling.

### 3.4 Hospital-software patterns worth naming (public, generic)

- **Department navigation pattern:** flat module list for small hospitals; grouped sidebar (Clinical / Departments / Operations / Admin) once modules exceed ~12 — ArogyaFlow is at 16, so grouping is due (§4.1).
- **Patient journey tracking:** timeline of encounters across settings, status per encounter — adopted in §11.
- **RBAC in hospital software:** role → module → capability → *scope* (department/ward/own-patients). ArogyaFlow has the first three; §6 adds scope.

---

## 4. ArogyaFlow UI 2.0 Blueprint

**Constraint honored:** no redesign. The shell (sidebar, topbar, cards, primitives, Ayurveda green/gold/cream via `tailwind.config.js`) stays. UI 2.0 is a *polish and pattern* pass.

### 4.1 Sidebar / navigation
- Group the 16 flat items into 4 labeled sections: **Care** (Dashboard, Patients, Appointments, Consultations, IPD, Nursing), **Departments** (Panchakarma, Dental, Physiotherapy, Lab, Pharmacy — rendered from department config in Phase 3+), **Operations** (Billing, Tasks, Approvals), **Admin** (Reports, Audit, Settings). Section labels in small caps, `text-ink/40`.
- Active item: left accent bar in the role's `accent` color (already stored per role in `roles.js`) + cream background — subtle, premium.
- Badge counts on Tasks and Approvals (open items for *my* scope) — data already available in state.
- Collapsed (icon-only) mode for tablets; keep the existing mobile drawer.

### 4.2 Topbar
- Add **global search** (T4): one input, searches patients by name/MRN/phone and modules by name; keyboard `/` to focus. This is the single highest-leverage premium feature for staff speed.
- Right cluster: department chip (user's department), role chip (exists), bell with open-task count, user menu. Keep sticky behavior.

### 4.3 Dashboard
- Today-first: "Today at Dr. P. Alikutty's" header with date (EN, with AR-ready formatting), then role-relevant stat cards (each card links to its filtered module view).
- Replace generic lists with **worklist previews**: "Your next 5 tasks", "Today's appointments in your department".
- Management sees the Command Center variant (§12) instead of the generic dashboard.

### 4.4 Patient profile (Patients.jsx is already the largest page — split it)
- Header band: name (EN/AR), MRN, age/sex, phone, allergy chip (red if any), preferred language, department tags, active episode chip (OPD/IPD).
- Tabs: **Overview · Episodes · Consultations · Therapy · Dental · Physio · Labs · Prescriptions · Bills · Journey**. Tabs render only if the department/module applies to the viewer's role (RBAC-scoped).
- "Journey" tab = §11 timeline.
- Quick actions respect capabilities: New appointment, New consultation, Admit, New bill.

### 4.5 Department hub (new pattern, Phase 3/4)
One generic page, `/departments/:code`, driven entirely by config: KPI row (today's appointments, open tasks, pending results/sessions), the department worklist (task queue), the department's appointment list, and shortcuts to its templates. Dental and Physio "modules" are mostly this page plus their special widgets (§9, §10).

### 4.6 Task / worklist screens
- Three scopes with clear tabs: **My queue** (assigned to me or unclaimed in my department) · **My department** · **All departments** (admin/management only — this closes the current leak where any role can view all).
- Card-or-row hybrid: priority edge color, label, MRN chip (click → patient), source→destination, age of task ("2h ago"), and *one* primary action per state: Accept → Start → Complete, plus Block with reason.
- Ownership display: "Accepted by Divya Raj · 10:42" — makes locking visible and social.
- Empty states with the leaf motif (brand) — calm, not clinical-white.

### 4.7 Tables
- Standardize a `DataTable` recipe on the existing primitives: sticky header, zebra-on-hover (already `hover:bg-cream/40`), right-aligned numeric columns, monospace MRN/codes (already used), column priority classes so low-value columns hide at `md`/`sm` instead of forcing wide scroll. Keep `overflow-x-auto` as the fallback.
- Row click opens a right-side **drawer** for details; modals reserved for create/edit.

### 4.8 Forms
- Two-column at `lg`, single at mobile; section headers with thin sand dividers.
- Mandatory-field asterisks driven by the template config (`getMandatoryFields`) — already the pattern for consultations; generalize it.
- Inline validation text under fields; never browser alerts. Sticky footer bar in modals/drawers with Cancel/Save so buttons never crowd (Codex flagged modal footers on narrow screens).

### 4.9 Status chips
Single source of truth `STATUS_TONES` map (extend the existing `Badge` tones): Pending=gold, Accepted=sky, In Progress=sky-strong, Completed=green, Blocked=rose, Cancelled=slate; episode chips OPD=green-outline, IPD=gold-solid; bill Paid/Due/Partially Paid; approval Pending/Approved/Rejected. Same chip everywhere = the "hospital-grade" feel.

### 4.10 Modals / drawers
- Modals: create/confirm only, max-w-lg, body scroll (already capped), sticky footer.
- Drawers (new primitive): record detail + timeline; width 420–480px; this is where task detail, patient quick-view, and approval review live.

### 4.11 Management command center
See §12 — visually: a denser grid of KPI tiles with sparklines, two bottleneck lists, and an alerts rail; same primitives, gold accents.

### 4.12 Mobile / responsive
- Nurse/therapist flows get first-class mobile passes (they walk wards/suites): tasks and vitals entry as stacked cards, large touch targets (min 44px), bottom-sheet actions.
- Dashboard stat grids: 1-col at `sm` (already mostly true); audit the two Codex-flagged pages (Dashboard, Settings) for table density; convert Settings department/profile tables to definition-list cards under `md`.

### 4.13 Clinical Smart Assist fields (§8)
Every clinical text input/textarea is rendered as a **SmartField**: type 2–3 letters and a suggestion panel appears — styled like the global-search dropdown (card/sand tokens), each row showing the term, a small category chip tinted by department color, and a "template" badge when the entry inserts longer text. ↑/↓ to navigate, Enter/Tab or click to insert at the caret, Esc to dismiss; the field never auto-accepts and never blocks free typing. This is the doctor-facing counterpart of the topbar search (§4.2) and the single biggest daily speed win in UI 2.0 — a consultation becomes a few keystrokes per field instead of full sentences retyped.

---
## 5. Department Engine Blueprint

The engine's premise: **the 15 departments differ in configuration, not in architecture.** One model, one hub page, one worklist system, one template binder.

### 5.1 Department config model

Extend the existing `departments` seed records (they already have `id`, `name`, `type`, `head`) into:

```js
{
  id: 'dep_dental',
  code: 'DENT',                    // short code used in tasks, pricing, chips
  name: 'Dental (ALIDS)',
  nameAr: '...',                   // bilingual, matches brand direction
  category: 'modern',              // see 5.2
  head: 'usr_...',                 // reference a user id, not a name string
  color: '#1b5140',                // hub/chip accent (from brand palette)
  icon: 'Tooth',                   // lucide icon name
  appointmentTypes: ['dental-consult', 'dental-procedure', 'dental-followup'],
  consultationTemplate: 'dental',  // key into consultationTemplates
  dictionaryScopes: ['dental', 'common-clinical'],  // Smart Assist term packs (§8)
  worklistTypes: ['dental-procedure', 'dental-followup', 'lab-request'],
  usesBeds: false, usesSessions: false, usesProcedures: true,
  pricingGroup: 'Dental',          // joins pricing.department
  active: true,
}
```

Migration note: `ensureCollections` in `HospitalContext.jsx` already guarantees the `departments` collection exists — the same hook is where legacy department records get these defaults.

### 5.2 Department categories

| Category | Departments | Engine behaviors switched on |
|---|---|---|
| `ayurveda` | Ayurveda, Panchakarma | Ayurveda consultation template (already built), therapy plans, pathya-apathya on discharge docs |
| `modern` | Allopathy, Dental/ALIDS | Common template (+dental extension), procedures, prescriptions |
| `allied` | Physiotherapy, Occupational Therapy, Audiology & Speech | Referral intake, assessment, session packages, outcome tracking |
| `wellness` | Yoga & Fitness, Ayur Beauty Clinic, Diet & Nutrition | Appointment + package + simple notes; diet gets referral worklist |
| `support` | Diagnostics, Pharmacy | Order-driven worklists (no appointments by default) |
| `operations` | Nursing/IPD, Billing, Management/Admin | Cross-department; scoped by ward/function instead of specialty |

(The current seed uses `support` for physio/OT/audiology — recategorize to `allied` so the session engine binds correctly.)

### 5.3 Department-specific appointment types

`appointmentTypes` per department feed the Appointments form: Ayurveda consult, Panchakarma session (suite + therapist + gender-appropriate suite), dental consult/procedure/follow-up, physio assessment/session, lab sample collection, diet counseling, yoga class **(assumption: class-type group bookings deferred)**. Each type carries default duration and default pricing item.

### 5.4 Department-specific consultation templates

Generalize `consultationTemplates.js` from the current binary (ayurveda/common) to a keyed registry: `ayurveda` (exists), `common` (exists), `dental` (§9.2), `physio-assessment` (§10.2), `diet` (intake, restrictions, plan). Each template = field list + mandatory list, exactly the existing pattern. The department config's `consultationTemplate` key selects it; `getConsultationFields(department)` keeps its signature.

### 5.5 Department dashboards & 5.6 worklists

Every department gets the same hub skeleton (§4.5): KPI tiles (config-declared), worklist (tasks where `assignedDepartment === dept.code`), today's appointments, recent activity. Dental adds the procedure-plan widget; physio adds the session-package widget; lab adds sample-state columns; pharmacy adds low-stock/expiry tiles (tasks already exist for these).

### 5.7 Shared modules vs. department modules

**Always shared (one implementation):** Patients & MRN, Appointments, Tasks, Billing/pricing, Approvals, Audit, Reports, Settings, IPD beds, Auth/RBAC.
**Department-parameterized:** Consultations (template per dept), Department Hub, worklists, dashboards.
**Department-special widgets (small, additive):** dental odontogram/procedure plan, physio outcome tracker, therapy suite scheduler, lab result entry, pharmacy stock.

### 5.8 Smart Assist binding (department-aware suggestions)
Each department config carries `dictionaryScopes` — the term packs its users see boosted (§8.3) — and the suggestion engine additionally boosts terms whose `departments` list contains the user's department code. Adding a new department therefore means adding its term pack + scope entry, with zero engine changes: the same "configuration, not code" rule that governs everything else in this engine. Live masters (medicines, lab tests, therapy/pricing catalog) are merged into suggestions at query time, so department catalogs never get duplicated into the dictionary.

---

## 6. RBAC / Access Control Matrix

### 6.1 Model upgrade (the key architectural change)

Current: `can(user, capability)` + `canSeeModule(user, module)` — role-level only. Add a third layer, **scope**:

```js
// roles.js (or new services/accessPolicy.js)
// scope: 'all' | 'department' | 'own' | 'none' per data domain
ROLES.dentist = { ...,
  scopes: { patients: 'department', appointments: 'department',
            consultations: 'department', tasks: 'department',
            billing: 'read-department', reports: 'none' } }
```

and central predicates used by every page/repo:

```js
canReadRecord(user, domain, record)   // module + capability + scope check
canWriteRecord(user, domain, record)
scopeFilter(user, domain)             // returns a predicate for lists
```

"Department-scoped patients" means: patients with any episode, appointment, task, or bill in the user's department (computed via a helper, cached per render). Row-level restrictions (e.g., a nurse sees only her ward's inpatients) use the same predicate shape with ward instead of department.

### 6.2 New roles to add

`dentist` (doctor variant scoped to Dental), `physiotherapist`, `therapist` (Panchakarma), `dietician`, `yoga` (wellness staff), and a reserved `patient` (portal, future, read-own only). Existing `doctor` becomes "physician with department scoping"; `admin`, `management`, `it`, `reception`, `nurse`, `pharmacy`, `lab`, `finance` remain.

### 6.3 Access matrix

Legend: ✅ full · 👁 read · 🏥 department-scoped · 🛏 ward-scoped · 👤 own-records · ➕ create · ✏️ update · ❌ hidden.

| Role | Patients | Appointments | Consultations | IPD/Beds | Therapy | Dental | Physio | Lab | Pharmacy | Billing | Tasks | Approvals | Audit | Reports | Settings |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ all | ✅ decide | ✅ | ✅ | ✅ |
| Management | 👁 | 👁 | ❌ clinical detail* | 👁 | 👁 counts | 👁 counts | 👁 counts | 👁 status | 👁 status | 👁 + discounts | 👁 all, reassign | ✅ decide | 👁 | ✅ export | ❌ |
| IT | 👤 users only | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 👁 system tasks | ❌ | 👁 | ❌ | ✅ users/config |
| Doctor (physician) | 🏥 ➕✏️ clinical | 🏥 ✏️ | 🏥 ➕✏️ own dept | 👁 + notes for own patients | ➕ plan, 👁 | ❌ | 👁 referrals they made | ➕ order, 👁 results | ❌ stock (👁 own Rx) | 👁 own patients' bills | 🏥 + own | request | ❌ | ❌ | ❌ |
| Dentist | 🏥 Dental patients ➕✏️ | 🏥 ➕✏️ | 🏥 dental template | ❌ | ❌ | ✅ own dept | ❌ | ➕ order 👁 | 👁 own Rx | 👁 dental bills | 🏥 | request | ❌ | ❌ | ❌ |
| Physiotherapist | 🏥 referred patients | 🏥 sessions ➕✏️ | 🏥 assessments | 👁 own inpatients' sessions | ❌ | ❌ | ✅ own dept | ❌ | ❌ | 👁 package status | 🏥 + own | request | ❌ | ❌ | ❌ |
| Therapist (Panchakarma) | 👁 assigned only | 👁 own sessions | 👁 doctor's plan | ❌ | ✏️ session status/notes | ❌ | ❌ | ❌ | ❌ | ❌ | 👤 own tasks | ❌ | ❌ | ❌ | ❌ |
| Nurse | 🛏 ward patients | ❌ | 👁 instructions | 🛏 ✏️ | 👁 schedule ✏️ status | ❌ | ❌ | 👁 results flag | 👁 MAR **(future)** | ❌ | 🛏 + own | ❌ | ❌ | ❌ | ❌ |
| Reception | ✅ demographics ➕✏️ (no clinical) | ✅ ➕✏️ | ❌ clinical | ➕ admit/transfer/discharge admin | ❌ | ❌ | ❌ | ❌ | ❌ | ➕ front-desk bills 👁 | 🏥 reception queue | request | ❌ | ❌ | ❌ |
| Lab | 👁 minimal banner (name/MRN/age/sex/allergy) | 👁 sample appts | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ own dept | ❌ | ❌ | 🏥 lab queue | ❌ | ❌ | ❌ | ❌ |
| Pharmacy | 👁 minimal banner | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | 🏥 pharmacy queue | ❌ | ❌ | ❌ | ❌ |
| Finance | 👁 demographics + bills | 👁 | ❌ | 👁 stay/charges | ❌ | 👁 billable | 👁 billable | 👁 billable | 👁 billable | ✅ + pricing | 🏥 finance queue | ✅ decide financial | 👁 financial | ✅ financial | ❌ |
| Dietician | 🏥 referred patients | 🏥 counseling appts | ➕ diet notes | 👁 diet orders for inpatients | ❌ | ❌ | ❌ | ❌ | ❌ | 👁 own services | 🏥 diet queue | ❌ | ❌ | ❌ | ❌ |
| Yoga/Fitness | 🏥 enrolled only | 🏥 classes/sessions | ➕ simple notes | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 👁 package status | 👤 own | ❌ | ❌ | ❌ | ❌ |
| Patient portal (future) | 👤 own record | 👤 own ➕ request | 👤 summaries | 👤 own stay | 👤 own schedule | 👤 own plan | 👤 own plan | 👤 own results (released) | 👤 own Rx | 👤 own bills/pay | ❌ | ❌ | ❌ | ❌ | ❌ |

\* Management sees clinical *volumes and statuses*, not consultation content — a deliberate privacy stance; admin retains full access for legitimate administration, and every admin/management read of clinical detail is audit-logged **(recommendation)**.

### 6.4 What each role should NOT see (explicit denials)

- Reception, Finance, IT, Pharmacy, Lab: no clinical consultation content (diagnosis text, Ayurveda assessment). Lab/Pharmacy get a *minimal patient banner* only.
- Dentist/Physio/Dietician/Yoga: no patients outside their department's episode/referral scope; no other departments' tasks; no audit log; no settings.
- Therapists: no billing amounts, no patient contact details beyond name/MRN **(recommendation)**.
- Nurses: no billing, no approvals, no other wards.
- Management: no user management (IT's job), no direct clinical documentation.
- Everyone except admin/management/finance: no pricing master edits (already enforced via `pricing.update`).

### 6.5 Management override rules

- Management/admin may **view** any task and **reassign** any task (new capability `tasks.reassign`) — but reassignment never silently completes work; it clears `acceptedBy` and audit-logs `task.reassigned`.
- Management/admin may release a task lock (`task.lock.released`) when an owner is unavailable.
- Approval overrides (discount/waiver/refund) stay in the Approval Center — `APPROVER_ROLES` already restricts deciding to admin/management/finance; keep it.
- Every override writes an audit record with `severity: 'notice'` minimum.

### 6.6 Audit requirements per role

Log (already have `buildAudit`): all creates/updates/deletes with old/new values (exists); all task lifecycle transitions incl. accept/release/reassign (new); all approval decisions (exists); all logins/logouts and failed logins (new); all exports (`reports.export` — new); admin/management access to clinical records (new); settings/user/pricing changes at `severity: 'notice'`+. Audit log is append-only; nobody gets `audit.delete`.

### 6.7 Dictionary governance (Smart Assist)
New capability `dictionary.manage`: admin from day one, plus designated senior doctors in SA‑P4 (per-user grant, not role-wide); IT gets read access for troubleshooting only. Custom terms are marked `source: 'custom'` and are deactivated, never deleted; every add/edit/deactivate is audit-logged at `notice` severity. Individual word suggestions are **not** logged (pure noise), but template/order-set insertions **are** (`smartassist.template.inserted`, carrying template id + consultation id) — and any future AI-assisted suggestion (SA‑P5) would be logged with an explicit `ai-assist` marker. No role ever gets the ability to make the assistant insert text without a doctor's explicit selection.

---

## 7. Task Ownership Workflow

### 7.1 Target task model (extends `buildTask` in workflow.js)

```js
{
  id, type, label, priority, mrn, relatedId, notes,        // existing
  sourceRole, createdBy, createdAt, dueAt,                 // existing
  assignedDepartment: 'LAB',      // NEW dept code; routing key #1
  assignedRole: 'lab',            // existing; routing key #2
  assignedUserId: null,           // NEW direct assignment (optional)
  acceptedBy: null, acceptedAt: null,   // NEW ownership lock
  startedAt: null, completedAt: null,   // NEW real timestamps (not just updatedAt)
  blockedReason: null,            // NEW
  status: 'Pending',              // lifecycle below
  updatedAt,
}
```

`TASK_ROUTES` gains `assignedDepartment` per type (lab-request→LAB, pharmacy-dispense→PHAR, dental-followup→DENT, physio-session→PHYS, …). Migration in `ensureCollections`: derive `assignedDepartment` for legacy tasks from `assignedRole` via a role→default-department map; null the new fields.

### 7.2 Status lifecycle

```
Pending ──accept──▶ Accepted ──start──▶ In Progress ──complete──▶ Completed
   │                   │                    │
   │                   └──release──▶ Pending (lock cleared, audited)
   │                                        ├──block(reason)──▶ Blocked ──unblock──▶ In Progress
   └──cancel──▶ Cancelled (creator/admin/mgmt only)
```

Rules: `accept` is **lock-safe** — it succeeds only if `acceptedBy == null` (repository verb checks current state before dispatch and returns `{ok:false, reason:'already-accepted'}` otherwise); `start`/`complete`/`block` require `acceptedBy === user.id` (or override per §6.5); `complete` stamps `completedAt`; direct Pending→Completed is allowed for one-tap queues (pharmacy) but stamps accept/start implicitly to the same user.

### 7.3 Visibility rules

| Viewer | Sees |
|---|---|
| Regular role | Tasks where `assignedUserId === me`, OR (`assignedDepartment === myDept` AND role matches or task unclaimed), OR `createdBy === me` (status-only view of tasks they raised) |
| Admin / Management | All tasks; department filter defaults to "All" |
| Everyone | Never other departments' queues (the current `scope: all` dropdown becomes role-gated) |

### 7.4 Action permission rules (central `canActOnTask(user, task, action)`)

`accept`: task visible ∧ unclaimed ∧ user's dept/role matches ∧ `tasks.update`. `start/complete/block`: owner only (or admin/mgmt override, audited). `cancel`: creator, admin, management. `reassign/release`: admin/management (`tasks.reassign`). The Tasks page, Department Hubs, and repositories all call this one function — no per-page logic (fixes the Codex "high risk" finding directly).

### 7.5 Admin/management override rules

As §6.5: view-all, reassign, release-lock, cancel — never silent-complete on someone's behalf without an audit trail; the UI labels overridden actions ("Completed by Admin on behalf of Lab").

---

## 8. Clinical Smart Assist (Doctor Autocomplete)

**Problem:** doctors, dentists, physiotherapists, therapists, and nurses retype the same clinical vocabulary — diagnoses, Ayurveda terms, therapy names, medicines, lab tests, advice — dozens of times a day. **Feature:** after 2–3 typed characters in any clinical field, ArogyaFlow suggests relevant terms and templates; the clinician clicks (or presses Enter/Tab) and moves on.

**The safety rule, stated first:** Smart Assist assists documentation; it never replaces clinical judgment. It never diagnoses, never prescribes, never auto-inserts on blur, never blocks free text. Every insertion is an explicit selection by the clinician, and template/order-set insertions are audit-logged (§6.7). Any future AI layer (SA‑P5) is a labeled helper behind the same confirm-always rule.

### 8.1 Doctor workflow — what it feels like
In a consultation, the doctor tabs through Chief complaint → History → Diagnosis → Treatment → Advice. In each field: type `Shi` → *Shirodhara / Shirovasti* appear (Ayurveda doctor sees them ranked first) → Enter inserts at the caret → keep typing. `BP` expands to *Blood Pressure* in vitals-adjacent text; `HT` offers *Hypertension* in diagnosis; in the prescription row, 3 letters of a medicine name pull from the live pharmacy master; in lab orders, from the lab test master. A dentist typing `RCT` gets *Root Canal Treatment*; a physiotherapist typing `ROM` gets *Range of Motion*; a therapist typing `Mob` gets mobility-assessment phrases. Selecting a **template** entry (e.g., "diabetic diet advice") inserts a paragraph of `templateText` the doctor then edits — a starting point, never a verdict.

### 8.2 Dictionary data model (`clinicalTerms` collection, seeded from `src/data/clinicalDictionary.js`)

```js
{
  id: 'ct_abhyanga',
  term: 'Abhyanga',
  termAr: null,                    // bilingual-ready, matches brand direction
  category: 'panchakarma-therapy', // see category list below
  departments: ['PANCH', 'AYUR'],  // [] or omitted = relevant to all
  specialty: null,
  aliases: ['Abhyangam'],
  abbreviations: [],               // e.g. ['RCT'] on Root Canal Treatment
  relatedPhrases: ['full-body warm oil massage'],
  templateText: null,              // set only for advice/plan/discharge templates
  language: 'en',
  active: true,                    // deactivate, never delete
  source: 'seed',                  // 'seed' | 'custom' (SA‑P4)
  createdBy: null, updatedAt: null,
}
```

**Categories:** `symptoms`, `diagnosis-allopathy`, `diagnosis-ayurveda`, `ayurveda-concept` (Ama, dosha/prakriti terms, samprapti vocabulary), `panchakarma-therapy`, `allopathy-term`, `dental-term`, `dental-procedure`, `physio-term`, `physio-assessment-phrase`, `medicine`, `lab-test`, `vital`, `procedure`, `advice-template`, `discharge-template`.

**Key design decision — merge live masters, don't duplicate them.** `medicines`, `labTests`, and the Panchakarma rows of `pricing` already exist in state. The suggestion engine converts them to suggestion entries **at query time**, so pharmacy stock names and the lab catalog are always current and never maintained twice. The dictionary file holds only vocabulary that has no master (symptoms, diagnoses, concepts, phrases, templates).

### 8.3 Suggestion engine (`src/services/smartAssist.js` — pure, local, offline)

```js
suggest(query, { state, user, departmentCode, fieldKey, limit = 8 })
```

- Triggers at ≥2 characters (configurable 2–3); UI debounces ~120 ms; everything runs locally against state — no network, which fits the current localStorage architecture and keeps it instant.
- Normalization: case-insensitive, diacritic-tolerant.
- Match priority: **1** exact abbreviation (`BP`, `HT`, `RCT`, `ROM`) → **2** term prefix → **3** alias prefix → **4** word-boundary contains.
- Ranking boosts: field-category binding (+3) · user's department in `departments` / `dictionaryScopes` (+2, SA‑P2) · recently used by this user (+1, last ~20 term ids kept locally) · template entries in plan-type fields (+1).
- `FIELD_BINDINGS` (fieldKey → categories): chiefComplaint→symptoms · history→symptoms+diagnoses · diagnosis→`diagnosis-ayurveda`+`ayurveda-concept` for Ayurveda-category departments, `diagnosis-allopathy` otherwise, plus `dental-term` for dental · treatment/chikitsaSutra/therapyAdvice→`panchakarma-therapy`+`procedure`+`advice-template` · prescription→`medicine` (live master) · lab order→`lab-test` (live master) · vitalsSnapshot→`vital` · dental procedure plan→`dental-procedure`+`dental-term` · physio fields→`physio-term`+`physio-assessment-phrase` · nursing notes→`vital`+`symptoms` · discharge/follow-up→`advice-template`+`discharge-template`.

### 8.4 SmartField component (`src/components/ui/SmartField.jsx`)
Wraps the existing `Input`/`Textarea` primitives (full props pass-through + `fieldKey`). Suggests on the current fragment (after the last comma/newline), so multi-item fields keep suggesting item by item. Keyboard: ↑/↓ navigate, Enter/Tab insert, Esc closes; click inserts; insertion replaces only the fragment at the caret with correct spacing. Template rows show a "template" badge and insert `templateText`. Mobile: suggestion strip with large touch targets above the keyboard area. And the two invariants, again, in component terms: closed dropdown = the field behaves byte-for-byte like the plain primitive; nothing is ever inserted without an explicit user action.

### 8.5 Field coverage map

| Clinical field | Where it lives | Bound categories |
|---|---|---|
| Chief complaint | Consultations (all templates) | symptoms |
| History | Consultations | symptoms, diagnoses |
| Diagnosis (Ayurveda) | Ayurveda template (vikriti/samprapti context) | diagnosis-ayurveda, ayurveda-concept |
| Diagnosis (Allopathy/common) | Common template | diagnosis-allopathy |
| Treatment plan / chikitsa sutra | Consultations | panchakarma-therapy, procedure, advice-template |
| Panchakarma plan | Therapy module + consultation therapyAdvice | panchakarma-therapy |
| Prescription | Consultation Rx rows | medicine (live master) |
| Lab orders | Consultation/Lab order form | lab-test (live master) |
| Dental procedure plan | Dental Hub procedure plans (§9.3) | dental-procedure, dental-term |
| Physiotherapy assessment | Physio template (§10.2) | physio-term, physio-assessment-phrase |
| Nursing notes | Nursing module | vital, symptoms |
| Discharge summary | Discharge flow / printDocument | discharge-template, advice-template |
| Follow-up advice | Common `followUpDate`-adjacent advice field | advice-template |

### 8.6 Rollout phases → roadmap mapping

| SA phase | What ships | Lands in roadmap |
|---|---|---|
| **SA‑P1** | Static curated dictionary (~400 terms) + suggestion engine + SmartField in consultations, prescriptions, lab orders | **Phase 2.5** (independent of the Department Engine) |
| **SA‑P2** | Department-aware ranking via `dictionaryScopes` + department codes; nursing/discharge coverage | **Phase 3** (needs department config) |
| **SA‑P3** | Reusable templates & order sets: common fever consultation, back-pain plan, Panchakarma course plan, dental RCT plan, knee rehab plan — order sets prefill a plan record the clinician reviews and edits | **Phases 5–6** (alongside dental/physio plans) |
| **SA‑P4** | Doctor/admin-managed dictionary in Settings (`dictionary.manage`, §6.7): add/edit/deactivate approved terms and templates | **Phase 7** (parallel work item) |
| **SA‑P5** | Optional AI-assisted suggestions — labeled, review-only, confirm-always, logged; never diagnoses or prescribes | **Phase 10+** (needs backend) |

### 8.7 Worked examples (acceptance checks for SA‑P1/P2)

| Typed | Suggested | Why |
|---|---|---|
| `Abh` | Abhyanga | panchakarma-therapy, term prefix |
| `Shi` | Shirodhara, Shirovasti | prefix; Ayurveda department boost ranks them first for Ayurveda users |
| `BP` | Blood Pressure | exact abbreviation |
| `HT` | Hypertension | exact abbreviation, diagnosis field binding |
| `Ama` | Ama, Amapachana-related concepts | ayurveda-concept; boosted for Ayurveda departments, present-but-lower elsewhere |
| `RCT` (dentist) | Root Canal Treatment | abbreviation + dental department boost |
| `ROM` (physiotherapist) | Range of Motion | abbreviation + physio boost, assessment field binding |
| `Mob` (therapist) | mobility assessment phrases | physio-assessment-phrase pack |
| partial plan text | saved treatment templates | template boost in plan-type fields |

### 8.8 Seed dictionary plan (~400 terms, curated — not generated blindly)
Sources: the hospital's own public treatment catalog (the 17 Panchakarma therapies in §2.1, already present in `pricing`), the public ALIDS service list (§9), the live medicine/lab masters (merged, not copied), plus curated packs of common symptoms, diagnoses (with abbreviations), vitals, dental terms, physio terms, and 10–15 starter advice/discharge templates. **Non-coding prerequisite:** each department head validates their pack — ask for "the 30 terms/phrases you type most" — before seeding (§14). Arabic `termAr` values can be added department-by-department later without touching the engine.

---
## 9. Dental / ALIDS Module Plan

**Principle (per your note):** dental is a department view over the shared platform — same MRN, same appointments, same billing, same audit, same management reporting. The public ALIDS service list (checkups, cleaning, fillings, root canals, extractions, crowns, bridges, implants, whitening) defines the initial procedure catalog.

### 9.1 Dental appointment queue
The Dental Hub worklist shows today's dental appointments (`appointmentTypes: dental-consult | dental-procedure | dental-followup`) in arrival order with status chips (Scheduled → Checked-in → In Chair → Done), plus open dental tasks. Reception checks patients in; the dentist works the queue top-down.

### 9.2 Dental consultation template (`consultationTemplate: 'dental'`)
COMMON_FIELDS (existing) + dental fields: `dentalComplaintTooth` (tooth numbers, FDI notation), `oralExamFindings`, `dentalDiagnosis`, `procedurePerformed`, `anesthesiaUsed` (y/n + agent), `postOpInstructions`, `nextVisitPlan`. Mandatory: chiefComplaint, dentalDiagnosis, allergyConfirmed (medical history matters — e.g., anticoagulants before extraction).

### 9.3 Dental procedure plan (the dental industry's "treatment plan, phased")
New collection `procedurePlans`: `{ id, patientId, mrn, department:'DENT', items:[{ tooth, procedureCode (→pricing), status: proposed|accepted|in-progress|completed|cancelled, phase, estAmount, consultationId }], consentStatus, createdBy, timestamps }`. Completing an item auto-creates a `billableItem` (existing pattern from therapy/nursing) and, if `nextVisitPlan`, a `dental-followup` task.

### 9.4 Tooth chart / odontogram — phased approach
- **Phase A (ship first):** structured tooth-number picker (FDI grid of buttons 11–48 + deciduous toggle) attached to complaints/procedures. Zero graphics risk, full data value.
- **Phase B:** flat SVG odontogram, color-coded by status (existing/proposed/completed) — read view generated from `procedurePlans`; click = filter to that tooth's history.
- **Phase C (only if demanded):** perio charting fields. Never 3D.

### 9.5 Imaging / attachments
localStorage cannot hold X-rays. Phase 5 ships an `attachments` *metadata* record (`{ type:'xray', label, externalRef, takenAt }`) so the workflow exists; real file storage arrives with the backend (Phase 10). Be honest in the UI: "Reference only — stored in imaging system."

### 9.6 Consent forms
Reuse `printDocument.js`: bilingual EN/AR consent templates per procedure class (extraction, RCT, implant); print → sign on paper → mark `consentStatus: signed` with staff attestation + audit entry. Digital signatures are a backend-era feature (Insta does e-sign pads; skip for now).

### 9.7 Billing
Dental pricing already seeded (`prc_opd_dental`); extend the pricing master with the ALIDS procedure catalog (grouped `department:'Dental'`). Procedure completion → billableItem → normal Billing module invoice (GST/discount/approval flows already exist). Package support (e.g., implant staged payments) reuses the physio package model **(assumption on hospital's actual payment plans)**.

### 9.8 Follow-up
`dental-followup` task type (route → DENT) + follow-up appointment suggestion on consultation save (uses existing `followUpDate` common field).

### 9.9 Reports
Dental section in Reports: procedures by type/period, revenue (from bills where department=Dental), follow-up compliance, top procedures — all derivable from existing collections + `procedurePlans`.

### 9.10 How dental users see the app
A `dentist` logs into: Dashboard (dental KPIs) · Patients (dental-scoped) · Appointments (dental) · Consultations (dental template) · **Dental Hub** (queue + procedure plans + odontogram) · Tasks (dental queue) — six items, nothing else. Reception still books; Finance still bills; Management still watches. That is the "connected, not separate" promise made concrete.

### 9.11 How management sees dental activity
Command Center tiles: dental appointments today, procedures completed this week, dental revenue MTD, pending follow-ups, plan-acceptance rate (proposed→accepted). Drill-down to the dental report.

### 9.12 Dental Smart Assist pack
Dentistry is abbreviation-heavy, which is exactly where autocomplete pays off: `RCT` → Root Canal Treatment, plus extraction under LA, scaling & polishing, composite/GIC filling, crown types, implant stages, and tooth-notation snippets ("26 mesial caries"). Dental consultation fields and the procedure-plan item picker are SmartFields bound to `dental-procedure`/`dental-term` (§8.5); SA‑P3 adds an "RCT plan" order set that prefills the §9.3 procedure-plan phases (consult → access/instrumentation → obturation → crown) for the dentist to edit, price-check, and confirm.

---

## 10. Physiotherapy Module Plan

**Engine note:** everything here is built on the `allied` category so OT, Audiology & Speech, and (lighter) Yoga reuse it.

### 10.1 Referral workflow
Doctors already have a `referral` field in COMMON_FIELDS. Upgrade it: choosing "Refer to Physiotherapy" on a consultation creates a `physio-referral` task (→ PHYS) carrying mrn, referring doctor, reason, and urgency. The physio worklist's "New referrals" lane is that queue. Walk-in/self-referral: reception books a `physio-assessment` appointment directly **(assumption: hospital allows direct physio booking)**.

### 10.2 Assessment form (`consultationTemplate: 'physio-assessment'`, SOAP-shaped)
Subjective: complaint, history, painScore (0–10 NPRS), functional limitations. Objective: ROM entries (`[{joint, movement, degrees, side}]`), strength grade (0–5 MMT), gait/posture notes, special tests. Assessment: clinical impression, goals (short/long). Plan: treatment plan, sessions recommended, frequency, precautions. Mandatory: complaint, painScore, impression, plan.

### 10.3 Pain / mobility / ROM tracking
Because pain and ROM are stored as **numbers**, each session note re-captures painScore (+ optional key ROM), and the patient's physio tab renders a simple trend line (pain ↓, ROM ↑) — the single most persuasive "premium" clinical feature, cheap to build from structured data.

### 10.4 Session scheduling & 9.5 therapist worklist
Sessions are appointments of type `physio-session` linked to a `treatmentPlan`. The therapist worklist = today's sessions (mine) + unclaimed department sessions + physio tasks, with Accept/Start/Complete straight from the §7 lifecycle (a session's task is auto-created per scheduled session).

### 10.6 Treatment plan
`treatmentPlans` collection: `{ id, patientId, mrn, department:'PHYS', referralId, diagnosis, goals, plannedSessions, frequency, packageId, status: active|completed|discontinued, outcomeSummary }`.

### 10.7 Progress notes
Per completed session: brief SOAP-lite note (done, response, painScore, next-session focus) written by the treating physiotherapist; visible to the referring doctor (closes the loop — a pattern every public physio platform emphasizes).

### 10.8 Package / session billing
`packages`: `{ id, patientId, pricingId, name:'10-session lumbar rehab', totalSessions, usedSessions, amount, status }`. Completing a session decrements the balance (lock-safe, same repository discipline) and shows "Session 4 of 10"; low-balance (≤2) raises a `package-renewal` task to reception. Pay-per-session simply creates billableItems instead. This package engine is shared with Panchakarma courses and Yoga memberships.

### 10.9 Outcome tracking
On plan completion: closing painScore vs. initial, goal-achievement (met/partial/not met per goal), optional functional score, outcomeSummary text. Aggregates feed reports ("avg pain reduction 4.2 points across 31 completed plans").

### 10.10 Reports
Referral volume by source department, sessions per therapist, package utilization/expiry, outcomes, physio revenue, no-show rate.

### 10.11 Physio Smart Assist pack
`ROM` → Range of Motion, NPRS/VAS, MMT grades, joint/movement names for the ROM entry rows, and standard assessment phrases ("reduced lumbar flexion", "antalgic gait", "improved tolerance to standing"). Assessment and progress-note fields bind to `physio-term`/`physio-assessment-phrase` (§8.5); SA‑P3 adds order sets like "knee rehab plan" or "low-back program" that prefill a treatment plan (§10.6) with goals, planned sessions, and frequency for the physiotherapist to adjust and confirm. The same pack serves Occupational Therapy and Audiology & Speech via their own `dictionaryScopes` — one engine, many allied departments.

---

## 11. Patient Journey Tracker

### 11.1 Model — derive first, store later
Phase 8 v1 needs **no new collection**: the journey is a computed timeline merging, per MRN: episodes (OPD/IPD open/close), appointments, consultations, therapy sessions, dental procedures, physio sessions, lab orders→results, prescriptions→dispensing, bills→payments, admissions/transfers/discharge (from episode + audit), and follow-up tasks. Each event → `{ at, department, type, label, status, refId }`, sorted descending. If performance or cross-episode analytics later demand it, materialize a `journeyEvents` collection written by the same builders that write audit records.

### 11.2 Presentation
- Patient profile "Journey" tab: vertical timeline, department-colored dots (department config `color`), status chips, click-through to source records; filter chips per department.
- **Active journey strip** on the patient header: the patient's open items across departments — e.g., `IPD (Ayurveda Ward) · Panchakarma 3/7 · Lab: 1 pending · Pharmacy: to dispense · Bill: ₹4,300 due` — this one strip *is* the connected-hospital experience.
- Discharge readiness view (extends existing `discharge.js` clearance logic): nursing ✓, pharmacy ✓, billing ✗, follow-ups booked ✗.

### 11.3 Coverage map
OPD (episode+consultation events) · IPD (admission/bed/transfer/nursing) · Ayurveda & Panchakarma (consultations, therapy sessions) · Dental (consults, procedure-plan items) · Physio (referral, assessment, sessions, outcome) · Diagnostics (ordered→collected→resulted→acknowledged) · Pharmacy (prescribed→dispensed) · Billing (billableItem→invoice→paid) · Discharge (clearances→summary printed) · Follow-up (tasks + booked follow-up appointments).

---

## 12. Management Command Center

Management's dashboard variant (role `management` lands here). All v1 numbers are computable from existing state.

**Row 1 — hospital pulse:** OPD visits today · IPD occupancy (occupied/total beds, %) · Admissions & discharges today · Revenue today/MTD (paid bills) · Pending dues total.
**Row 2 — flow & delays:** Pending approvals (count + oldest age) — click → Approval Center · Discharge-ready but blocked (from clearance states) · Lab TAT: pending results + count older than X hours · Pharmacy queue: undispensed prescriptions + low-stock/near-expiry alerts (tasks already exist) · Open critical tasks.
**Row 3 — departments:** load table per department (today's appointments, open tasks, oldest open task age, revenue MTD) with the department `color` — this is "department load" and "bottlenecks" in one table; a bottleneck badge appears when oldest-open-task age or queue length crosses a threshold (config).
**Row 4 — clinical operations:** therapy sessions today (scheduled/completed) · dental procedures this week · physio active plans & sessions · staff workload (open tasks per assignee, top 10 — from `assignedUserId`).
**Alerts rail:** critical tasks, blocked tasks with reasons, approvals older than 24h, negative-stock/expiry warnings.

Every tile links to the filtered underlying module (no dead-end numbers), and management's access remains read+decide, never edit-clinical (§6).

---

## 13. Final Implementation Roadmap

| Phase | Scope | Key files | Exit criteria |
|---|---|---|---|
| **0 — Stabilize** | Fix login-vs-state.users bug; archive-don't-delete patients with related-record guard; remove dead code (`TASK_PRIORITY` import); resolve management `therapy.read`-without-module inconsistency (grant module read or drop capability) | AuthContext.jsx, Settings.jsx, Patients.jsx, repositories.js, roles.js | Settings user changes affect login; no orphaned records on patient removal; build clean |
| **1 — Department-aware Task Ownership** | Task model fields + migration; lock-safe lifecycle verbs; `canActOnTask`; Tasks page scopes & actions | workflow.js, workflowSeed.js, repositories.js, HospitalContext.jsx, Tasks.jsx, roles.js | No role can act on another department's task; ownership visible; audit trail complete |
| **2 — UI 2.0 polish** | Sidebar groups, topbar global search, status-chip system, table/form/drawer patterns, mobile audit | Sidebar, Topbar, primitives, index.css, page-level tidy | Consistent chips everywhere; search works; flagged mobile issues fixed |
| **2.5 — Clinical Smart Assist v1 (SA‑P1)** | Curated clinical dictionary + suggestion engine + SmartField wired into consultation, prescription, and lab-order fields; merges live medicine/lab/therapy masters | new clinicalDictionary.js, smartAssist.js, SmartField.jsx, Consultations.jsx | 2–3 letters → ranked suggestions; insertion is always doctor-confirmed; free text unaffected |
| **3 — Department Engine** | Department config model + migration; template registry; new roles + scope layer (`scopeFilter`, `canReadRecord`); department-aware Smart Assist ranking (SA‑P2) | seed.js, HospitalContext.jsx, consultationTemplates.js, roles.js, new accessPolicy.js | Departments fully config-driven; dental/physio users see only their scope |
| **4 — Department Worklists** | Generic `/departments/:code` hub (KPIs, worklist, appointments); nav renders departments from config | new DepartmentHub.jsx, navigation.js, App.jsx | Lab/pharmacy/therapy work from hubs; per-page task logic deleted |
| **5 — Dental / ALIDS** | Dental template, procedure plans + billing hooks, tooth-number picker (odontogram Phase A/B), consent print, follow-up tasks, dental reports, dental Smart Assist pack + RCT order set (SA‑P3) | consultationTemplates.js, new dental widgets, printDocument.js, Reports.jsx | Dentist completes consult→plan→procedure→bill→follow-up end-to-end |
| **6 — Physiotherapy** | Referral tasks, assessment template, treatment plans, sessions + therapist worklist, packages, progress/outcomes, physio Smart Assist pack + rehab order sets (SA‑P3) | consultationTemplates.js, new physio widgets, Appointments.jsx, Billing.jsx | Referral→assessment→sessions→outcome→billing end-to-end; pain trend renders |
| **7 — Diagnostics/Lab upgrade** | Sample states (ordered→collected→resulted→acknowledged), panels, critical-result flow to doctor tasks, TAT metrics; in parallel: doctor-managed dictionary in Settings (SA‑P4) | Lab.jsx, workflow.js, seed.js | Lab worklist state-driven; critical results generate doctor tasks |
| **8 — Patient Journey Tracker** | Journey builder service + profile tab + active-journey strip + discharge readiness | new journey.js, Patients.jsx, discharge.js | Timeline correct for seeded demo patients across ≥4 departments |
| **9 — Management Command Center** | §12 dashboard, thresholds config, alerts rail | Dashboard.jsx / new CommandCenter.jsx | Management lands on it; every tile drills down |
| **10 — Backend/security/compliance readiness** | Storage adapter → API; real auth (hashed passwords, sessions); server-enforced RBAC mirror; file storage (dental imaging); backups; audit hardening; NABH-aligned record policies **(consult compliance advisor)**; optional AI-assisted suggestions, review-only (SA‑P5) | storageAdapter.js boundary + new backend | App runs against API with no UI rewrite |

**Sequencing rationale:** 0 before everything (trust), 1 before UI polish (Codex's recommendation — behavior before beauty), 3 before 5/6 (dental/physio are *consumers* of the engine, building them first would create the disconnected silos you explicitly don't want). Smart Assist v1 (Phase 2.5) can land before the Department Engine because its data layer is independent; its department-aware ranking (SA‑P2) deliberately waits for Phase 3 config.

---

## 14. Prioritized Action Plan (next 4–6 working sessions)

1. **Session 1 (Phase 0):** login/users fix + patient archive guard. Small, testable, removes the two "silent lie" bugs.
2. **Session 2 (Phase 1a):** task model + migration + repository verbs with lock-safety. Pure data/services — no UI risk.
3. **Session 3 (Phase 1b):** `canActOnTask` + Tasks.jsx scopes/actions/ownership display. Phase 1 exit test: nurse cannot complete a pharmacy task; second accept fails gracefully.
4. **Session 4 (Phase 2a):** sidebar grouping + topbar search + chip system.
5. **Session 5 (Phase 3a):** department config migration + template registry + new roles with scope layer.
6. **Session 6 (Phase 4):** DepartmentHub page; then proceed down the roadmap to Dental (Phase 5).

Parallel non-coding actions: confirm ALIDS procedure/pricing list with the hospital; confirm physio package pricing; confirm which staff get which roles (needed for §6 seeding); collect the Arabic strings for department names; have each department head validate their Smart Assist starter pack (§8.8) — ask for the 30 terms/phrases they type most.

### The 30-Day V1 Build Plan

Assumes ~22 working days in the month, one prompt-sized chunk per day plus its checks; commit and tag after every green day. **V1 definition:** stable core (Phase 0), owned tasks (Phase 1), UI 2.0 essentials (Phase 2), Smart Assist SA‑P1/P2 (Phase 2.5 + 3), Department Engine and hubs (Phases 3–4). Dental/physio begin immediately after as V1.5 stretch.

| Days | Focus | Chunks (prompt #) | Exit test |
|---|---|---|---|
| 1–2 | Phase 0 trust fixes | Login vs `state.users` (P1); patient archive guard (P2) | Settings-created user can log in; archive blocked for the seeded admitted patient |
| 3–5 | Task ownership — data + policy | Task model + migration (P3); lock-safe verbs + taskPolicy (P4) | Second `accept` returns `{ok:false}`; audit rows written for every verb |
| 6–7 | Task ownership — UI | Tasks page scopes/actions/ownership (P5) | Nurse cannot see or act on pharmacy tasks; "Accepted by …" line visible |
| 8–9 | UI 2.0 core | Sidebar groups + chip system (P6); topbar global search (P7) | Same items per role, now grouped; `/` search finds a patient by partial MRN |
| 10–12 | Smart Assist SA‑P1 | Dictionary + engine (P11); SmartField in consultations/Rx/lab (P12); half-day regression | "Abh"→Abhyanga, "BP"→Blood Pressure, "HT"→Hypertension; free typing byte-identical with dropdown closed |
| 13–15 | Department Engine | Dept config + template registry (P8); scope layer + dentist/physiotherapist roles (P9) | Dentist login sees only dental-scoped patients; Ayurveda consult fields unchanged |
| 16–17 | Department hubs | Generic DepartmentHub + shared TaskTable extraction (P10) | `/departments/DENT` works for the dentist; blocked for nurse; Tasks page behavior unchanged |
| 18–19 | Smart Assist SA‑P2 | Department-aware ranking + nursing/discharge coverage (P13) | Dentist typing "RCT" ranks Root Canal Treatment first; Ayurveda doctor's "Shi" ranks Shirodhara above dental terms |
| 20–21 | Hardening | Full regression across all roles; mobile audit fixes (Dashboard/Settings); scripted demo walkthrough | `npm run build` clean; demo runs end-to-end without console errors |
| 22 | **V1 release** | Tag `v1.0`; backup; staff walkthrough with 2–3 real users per role | Sign-off + a written feedback list |
| 23–30 (stretch) | V1.5 start | Dental consultation template + procedure plans (§9), first dental order set (SA‑P3) | Dentist completes consult → plan → bill on demo data |

Running through the month in parallel (non-coding): doctors validate the ~400-term dictionary using the §8.2 category list as a worksheet; ALIDS procedure pricing confirmed; role assignments confirmed. If any coding day runs over, push the stretch week — never compress the hardening days.

---

## 15. Next 13 Coding Prompts (paste into Claude Opus 4.8 / Codex)

Each prompt is deliberately small, preserves current UI unless UI-specific, names files, names what NOT to change, and ends with build checks. Run them in numeric order — except Prompts 11–12 (Smart Assist SA‑P1), which are independent of Prompts 8–10 and can run any time after Prompt 5; Prompt 13 requires Prompt 8. The 30-Day plan (§14) shows the recommended interleaving. Commit after each green build.

---

### Prompt 1 — Phase 0: Login must use state.users

> Use High thinking effort. Work on branch `audit-and-ui-foundation` of the ArogyaFlow React/Vite app (palikutty-hms).
> **Bug:** `src/store/AuthContext.jsx` authenticates against `seedUsers` imported from `src/data/seed.js`, so users created/edited/disabled in Settings (which writes `state.users`) never affect login.
> **Task:** Make login authenticate against the persisted hospital state's `users` collection. Read the same storage the app persists to via `src/services/storageAdapter.js` (fall back to seed users only when no persisted state exists). Keep the same login return shape `{ok, error, user}` and the same safe-user fields (id, name, email, role, department). Respect `status === 'disabled'`.
> **Do NOT change:** the login page UI, seed user credentials, the storage key/versioning, or HospitalContext.
> **Files likely touched:** `src/store/AuthContext.jsx` only (plus, if needed, a small named export from `storageAdapter.js`).
> **Checks:** `npm run build` passes; manually verify (1) seed accounts still log in on a fresh browser profile, (2) a user added in Settings can log in, (3) a user disabled in Settings is rejected with the disabled message.

---

### Prompt 2 — Phase 0: Archive patients instead of hard delete

> Use High thinking effort. ArogyaFlow (React/Vite, localStorage state via reducer + repositories).
> **Bug:** deleting a patient removes only the patient record, orphaning episodes, appointments, consultations, bills, labTests, prescriptions, vitals, nursingNotes, therapies, tasks that reference the patientId/mrn.
> **Task:** Replace hard delete with archive: add `status: 'archived'` + `archivedAt` on the patient; exclude archived patients from default lists/search (add an "Include archived" toggle in the Patients page filter area, matching existing filter styling); block archive with a clear toast if the patient has an **open** episode or unpaid bill; write an audit record (`patient.archived`). Keep `patients.delete` capability name but route it to archive.
> **Do NOT change:** the patient form, table layout, MRN generation, or any other module's behavior.
> **Files likely touched:** `src/pages/Patients.jsx`, `src/services/repositories.js`, `src/store/reducer.js` (only if an action is missing), `src/services/workflow.js` (audit action constant, if you keep them centralized).
> **Checks:** build passes; archived patient disappears from lists but their bills/episodes still render on other pages; archiving is blocked for the seeded admitted patient.

---

### Prompt 3 — Phase 1a: Task model fields + migration (no UI)

> Use High thinking effort. ArogyaFlow.
> **Task (data layer only):** Extend the task model with `assignedDepartment` (string dept code), `assignedUserId`, `acceptedBy`, `acceptedAt`, `startedAt`, `completedAt`, `blockedReason` — all defaulting to null.
> 1. `src/services/workflow.js`: extend `buildTask` and `TASK_ROUTES` (add a sensible `assignedDepartment` per route: lab→'DIAG', pharmacy→'PHAR', finance→'FIN', reception→'FRONT', doctor→'AYUR', nurse→'IPD'). Add `TASK_STATUS` value `'Accepted'` and `'Blocked'` in the correct lifecycle order.
> 2. `src/data/workflowSeed.js`: add the new fields to the 4 seed tasks (leave them unclaimed).
> 3. `src/store/HospitalContext.jsx` `ensureCollections`: migrate legacy persisted tasks — derive `assignedDepartment` from `assignedRole` via a small role→dept map, null the other new fields. Migration must be idempotent.
> **Do NOT change:** Tasks.jsx or any page/UI, approvals, audit shape.
> **Checks:** `npm run build`; with an old localStorage state, app loads and Tasks page still renders; new fields visible in devtools state.

---

### Prompt 4 — Phase 1b: Lock-safe lifecycle verbs + central task policy

> Use High thinking effort. ArogyaFlow. Builds on the new task fields.
> **Task (services only):**
> 1. `src/services/repositories.js` — extend `base.tasks` with: `accept(id, user)` (fails with `{ok:false, reason:'already-accepted'}` if `acceptedBy` is set; else stamps acceptedBy/acceptedAt and status 'Accepted'), `start(id, user)` (owner only; stamps startedAt, 'In Progress'), `complete(id, user)` (owner or implicit accept+start for one-tap flows; stamps completedAt), `block(id, user, reason)`, `unblock(id, user)`, `release(id, user)` (clears lock → 'Pending'), `reassign(id, user, {department, role, userId})`. Every verb returns `{ok, reason?}` and never throws.
> 2. New `src/services/taskPolicy.js` — `canSeeTask(user, task)` and `canActOnTask(user, task, action)` implementing: regular users see own/department tasks; admin & management see all; accept requires unclaimed + dept/role match + `tasks.update`; start/complete/block require ownership; cancel = creator/admin/management; reassign/release = admin/management (add capability `tasks.reassign` to admin & management in `src/config/roles.js`).
> 3. Audit every verb via the existing `logAudit`/`buildAudit` pattern (call sites can pass the audit function — follow how `decide` on approvals is used today).
> **Do NOT change:** Tasks.jsx yet, task seed data, approvals.
> **Checks:** build passes; quick console test in dev: second `accept` on the same task returns `{ok:false}`.

---

### Prompt 5 — Phase 1c: Tasks page — scopes, ownership, actions

> Use High thinking effort. ArogyaFlow. UI chunk — Tasks page only.
> **Task:** Rework `src/pages/Tasks.jsx` on top of `taskPolicy` + repository verbs:
> 1. Scope tabs: **My queue** (mine + unclaimed in my department), **My department**, **All departments** — the third rendered only for admin/management (`canSeeTask` governs the underlying list either way).
> 2. Row actions by state via `canActOnTask`: Pending→Accept; Accepted→Start (+Release for owner/managers); In Progress→Complete / Block(reason prompt via existing Modal); Blocked→Unblock. Show owner line "Accepted by {name} · {time}" under the label. Keep table structure, Badge tones (add Accepted=sky, Blocked=rose), and page header style.
> 3. Stat cards: Unclaimed (my dept), Mine in progress, Critical open, Blocked.
> 4. Remove the now-dead direct `update('tasks', …)` status path and the unused `TASK_PRIORITY` import.
> **Do NOT change:** other pages, primitives API, task creation flows elsewhere.
> **Checks:** build passes; as `nurse@palikutty.in` you cannot see or act on pharmacy tasks; as admin you can reassign; accepting an already-accepted task shows a toast error, not a crash.

---

### Prompt 6 — Phase 2a: Sidebar groups + status chip system (visual only)

> Use Medium thinking effort. ArogyaFlow. Pure UI chunk — no behavior changes.
> **Task:**
> 1. `src/config/navigation.js`: add a `group` field ('Care', 'Departments', 'Operations', 'Admin') per item; `src/components/layout/Sidebar.jsx`: render group labels (small caps, muted) and keep per-role filtering via `canSeeModule` exactly as is; active item gets a 3px left accent bar using the current role's `accent` from ROLES.
> 2. New `src/config/statusTones.js`: single exported map for task/approval/bill/episode statuses → Badge tone; refactor Tasks, Approvals, Billing, IPD, Lab pages to import it instead of local `*_TONE` maps (visual output must remain identical where statuses already existed).
> **Do NOT change:** routes, RBAC, Topbar, page content, tailwind config, brand colors.
> **Checks:** build passes; every role's sidebar shows the same items as before (only grouped); chips render identically or better; no console warnings.

---

### Prompt 7 — Phase 2b: Topbar global search

> Use Medium thinking effort. ArogyaFlow. UI chunk — Topbar only.
> **Task:** Add a global search input to `src/components/layout/Topbar.jsx`: searches patients (name, MRN, phone — case-insensitive, max 8 results) and navigable modules (label match, respecting `canSeeModule`). Results in a dropdown panel styled with existing card/sand tokens; Enter/click navigates (patient → Patients page with a `?q=` param the Patients page already-existing search state should read on mount; module → its route). `/` focuses the input; Escape closes.
> **Do NOT change:** layout height, mobile drawer, notification/user areas, any page except reading `?q=` in Patients.jsx.
> **Checks:** build passes; search finds seeded patient by partial MRN; a lab user searching a module they can't see gets no module result; mobile layout unbroken (search collapses to an icon under `sm`).

---

### Prompt 8 — Phase 3a: Department config model + migration

> Use High thinking effort. ArogyaFlow. Data/config chunk.
> **Task:**
> 1. `src/data/seed.js`: upgrade the 11 `departments` records with `code` (AYUR, ALLO, DENT, PHYS, OT, AUDIO, YOGA, BEAUTY, DIET, DIAG, PANCH), `category` ('ayurveda'|'modern'|'allied'|'wellness'|'support'), `color` (pick from existing brand palette in tailwind.config.js), `icon` (lucide name), `appointmentTypes` (array of strings), `consultationTemplate` ('ayurveda'|'common' for now), `active: true`. Recategorize Physio/OT/Audiology to 'allied'. Change `head` to reference a user/doctor id where one exists, else keep the name string (do not invent users).
> 2. `src/store/HospitalContext.jsx` `ensureCollections`: idempotent migration filling these fields on legacy persisted departments (match by id).
> 3. New `src/config/departmentUtils.js` (or extend an existing config module): `getDepartment(state, code)`, `departmentOptions(state)` helpers; refactor the 2–3 places that currently hard-code department name strings in selects to use them (search for 'Ayurveda' string literals in pages before deciding; change only selects, not display text).
> 4. `src/config/consultationTemplates.js`: introduce a keyed `TEMPLATES` registry mapping template keys → {fields, mandatory}; keep `getConsultationFields`/`getMandatoryFields` signatures working via the department's `consultationTemplate` key with the old type-based behavior as fallback.
> **Do NOT change:** page layouts, RBAC, tasks, billing.
> **Checks:** build passes; old localStorage state migrates without losing departments; Ayurveda consultations still show the classical fields; Allopathy still shows common fields.

---

### Prompt 9 — Phase 3b: Scope layer + dentist/physiotherapist roles

> Use Extra High thinking effort — this is the access-control chunk. ArogyaFlow.
> **Task:**
> 1. New `src/services/accessPolicy.js`: `scopeFilter(user, state, domain)` returning list predicates for domains 'patients' | 'appointments' | 'consultations' | 'tasks'. Semantics: 'all' (admin/management/reception-for-patients), 'department' (records whose department matches, or patients having any episode/appointment/task in the user's department), 'own' (created-by/assigned-to me). Determine a user's department code via their `department` field mapped to the new department `code`s (add a tolerant name→code map for legacy strings like 'Front Desk', 'IT').
> 2. `src/config/roles.js`: add roles `dentist` and `physiotherapist` (modules: dashboard, patients, appointments, consultations, tasks; capabilities mirroring doctor's clinical set minus ipd/therapy; add a `scopes` object per role for the domains above; give existing roles explicit scopes matching current behavior so nothing tightens accidentally except where Codex flagged leaks). Add seed users `dentist@palikutty.in` (Dental) and `physio@palikutty.in` (Physiotherapy) in `src/data/seed.js` following the existing user shape.
> 3. Apply `scopeFilter` in `Patients.jsx`, `Appointments.jsx`, `Consultations.jsx` list-building `useMemo`s (one-line filter insertion; do not restructure the pages).
> **Do NOT change:** admin/management/reception effective visibility, Tasks.jsx (already policy-driven), Billing/Lab/Pharmacy pages, login flow.
> **Checks:** build passes; dentist login sees only patients with Dental episodes/appointments/tasks; doctor (Ayurveda) no longer sees pure-Dental patients in Consultations; admin sees everything unchanged.

---

### Prompt 10 — Phase 4: Generic Department Hub page

> Use High thinking effort. ArogyaFlow.
> **Task:** New route `/departments/:code` → `src/pages/DepartmentHub.jsx`:
> 1. Reads the department config; guards access (user's department must match, or admin/management — reuse accessPolicy).
> 2. Renders: PageHeader with dept name/icon/color; 4 StatCards (today's appointments, unclaimed tasks, my open tasks, open tasks total — computed from state); the department worklist (reuse the task table/actions from Tasks.jsx by extracting a shared `TaskTable` component into `src/components/` — refactor Tasks.jsx to use it too, keeping its behavior identical); today's department appointments list.
> 3. `src/config/navigation.js` + `Sidebar.jsx`: render active departments (from state config) under the 'Departments' group for users whose role/department qualifies; keep existing module items intact (Pharmacy/Lab keep their dedicated pages; their hub links can wait).
> 4. `src/App.jsx`: add the route inside the existing guarded layout.
> **Do NOT change:** task lifecycle logic, RBAC semantics, other pages' behavior, brand styling.
> **Checks:** `npm run build`; `/departments/DENT` as dentist shows dental queue and stats; nurse navigating to `/departments/DENT` is redirected/blocked; Tasks page behavior unchanged after the TaskTable extraction.

---

### Prompt 11 — Smart Assist SA‑P1a: clinical dictionary + suggestion engine (no UI)

> Use High thinking effort. ArogyaFlow (React/Vite, localStorage state).
> **Task (data + services only — no UI in this chunk):**
> 1. New `src/data/clinicalDictionary.js`: export `clinicalTerms`, a curated seed array (~150 entries to start) with shape `{ id, term, category, departments, aliases, abbreviations, relatedPhrases, templateText, language:'en', active:true, source:'seed' }`. Include: the 17 Panchakarma therapies already named in `pricing`/seed (Abhyanga, Shirodhara, Shirovasti, Kizhi, Dhanyamla Kizhi, Pizhichil, Kati/Janu/Greeva Basti, Udwarthana, Swedana, Avagaha Sweda, Tharpana, Marma/Rasa/Rasayana/Vajeekarana Chikitsa); ~30 common symptoms; ~30 common diagnoses with abbreviations (Hypertension/HT, Diabetes Mellitus/DM, …); vitals (Blood Pressure/BP, SpO2, …); a starter Ayurveda-concept pack (Ama, Agni, dosha terms); ~15 dental terms (Root Canal Treatment/RCT, extraction, scaling, composite filling, crown, implant); ~15 physio terms (Range of Motion/ROM, NPRS, MMT, gait phrases); 5 advice templates with `templateText`. Categories exactly: symptoms, diagnosis-allopathy, diagnosis-ayurveda, ayurveda-concept, panchakarma-therapy, allopathy-term, dental-term, dental-procedure, physio-term, physio-assessment-phrase, vital, procedure, advice-template, discharge-template.
> 2. New `src/services/smartAssist.js`: pure function `suggest(query, { state, user, departmentCode, fieldKey, limit=8 })`. Trigger at ≥2 chars; case-insensitive; match priority: exact abbreviation > term prefix > alias prefix > word-boundary contains. **Merge live masters at query time** — `state.medicines` as category 'medicine', `state.labTests` as 'lab-test', Panchakarma `pricing` rows as 'panchakarma-therapy' — do NOT duplicate them into the dictionary file. Export a `FIELD_BINDINGS` map (fieldKey → categories) and boost matches whose category is bound to the given fieldKey. Return `[{id, term, category, templateText?}]`.
> 3. `src/store/HospitalContext.jsx` `ensureCollections`: add a `clinicalTerms` collection seeded from the dictionary file (idempotent, like the other collections).
> **Do NOT change:** any page/UI, consultation templates, roles, tasks.
> **Checks:** `npm run build` passes; in dev console `suggest('abh', …)` returns Abhyanga first, `suggest('bp', …)` returns Blood Pressure first, `suggest('x', …)` returns `[]` (below threshold); an old localStorage state loads and gains `clinicalTerms`.

---

### Prompt 12 — Smart Assist SA‑P1b: SmartField component wired into clinical fields

> Use High thinking effort. ArogyaFlow. Builds on `smartAssist.js` from the previous chunk.
> **Task:**
> 1. New `src/components/ui/SmartField.jsx`: wraps the existing `Input`/`Textarea` primitives (full props pass-through, plus a `fieldKey` prop). On ≥2 chars in the current fragment (text after the last comma/newline before the caret), call `suggest` debounced ~120 ms and render a dropdown styled with the existing card/sand tokens: term, a small category chip, a "template" badge when `templateText` exists. Keyboard: ↑/↓ navigate, Enter/Tab insert, Esc closes; click inserts. Insertion replaces only the current fragment at the caret with correct spacing; template rows insert their `templateText`. **Never insert on blur; with the dropdown closed the field must behave exactly like the plain primitive.**
> 2. Wire SmartField into `src/pages/Consultations.jsx` for the clinical text fields it renders (match by field key: chiefComplaint, diagnosis, notes, treatment, therapyAdvice, chikitsaSutra, follow-up/advice), the prescription medicine-name input, and the lab-test name input (check whether that lives in Consultations.jsx or Lab.jsx and wire wherever tests are typed today).
> **Do NOT change:** template/mandatory-field logic, form layout or validation, Toast/Modal primitives, any other pages.
> **Checks:** build passes; typing "Shi" in treatment shows Shirodhara/Shirovasti and Enter inserts mid-sentence at the caret correctly; typing a seeded medicine's first 3 letters in the Rx row suggests it from the live master; full regression: create and save a consultation exactly as before with the dropdown unused.

---

### Prompt 13 — Smart Assist SA‑P2: department-aware ranking + wider coverage

> Use Medium thinking effort. ArogyaFlow. **Requires the department-config chunk (Prompt 8).**
> **Task:**
> 1. `src/services/smartAssist.js`: add ranking boosts — +2 when the user's department code appears in a term's `departments`, +1 when the term's category is in the department config's `dictionaryScopes` (add `dictionaryScopes` to the department configs in `seed.js` + migration if not already present), +1 for the user's ~20 most recently inserted term ids (persist per user via the same localStorage patterns as `storageAdapter`).
> 2. Extend SmartField coverage to `src/pages/Nursing.jsx` note fields and the discharge-summary advice fields (wherever `discharge.js` output is composed).
> 3. Audit only template insertions: log `smartassist.template.inserted` via the existing `logAudit` pattern (module 'consultations', recordId = the consultation/record id when available). Individual word suggestions are never logged.
> **Do NOT change:** the suggestion dropdown's look, dictionary content semantics, roles/RBAC, task logic.
> **Checks:** build passes; as the dental seed user, "RCT" ranks Root Canal Treatment first; as the Ayurveda doctor, "Shi" ranks Shirodhara above any dental term; inserting the same term twice makes it rank higher the second time; one audit row appears after a template insertion.

---

**After these thirteen:** Prompt 14+ begins Phase 5 (dental consultation template + procedure plans + the RCT order set), following §9 — by then the engine, scoping, worklists, and Smart Assist bindings they depend on all exist.

---

## 16. Sources (public information used)

**Hospital & ALIDS**
- Dr. P. Alikutty's Ayurveda & Modern Hospital — homepage, departments, dental page, facilities: https://drpalikuttysayurveda.com/ · https://drpalikuttysayurveda.com/departments/dental
- ALIDS — Alikutty's Laser Implants & Dental Speciality: http://alids.in/
- Hospital/ALIDS background listings: https://haadimedics.com/hospital/kottakkal-ayurveda-modern-hospital · https://yappe.in/kerala/kottakkal/dr-p-alikutty-s-kottakkal-ayurveda-modern-hospital/81183

**InterSystems TrakCare (public pages)**
- Product overview & FAQ: https://www.intersystems.com/products/trakcare/
- Unified system / single patient record: https://www.intersystems.com/sg/trakcare/unified-healthcare-information-system/
- Departments, documentation & extensions (TrakCare Core + extensions): https://www.intersystems.com/products/trakcare/departments-documentation-extensions/
- TrakCare Assistant announcement: https://www.intersystems.com/news/reimagine-clinician-workflow-trakcare-assistant/
- Medcare deployment news: https://www.intelligentcio.com/me/2021/08/16/medcare-implements-intersystems-trakcare-unified-healthcare-information-system/

**Practo Insta (public pages)**
- Insta HMS overview & features: https://www.practo.com/providers/hospitals/insta · https://www.practo.com/providers/hospitals/insta/features
- Hospital solution & module list: https://www.instahms.com/hospital · https://www.instahms.com/hospital-information-system · https://go.instahms.com/en/free-demo
- Integrations: https://www.instahms.com/integrations

**Dental workflow patterns (public product pages)**
- CareStack treatment planning & charting: https://carestack.com/dental-software/features/treatment-planning · https://carestack.com/dental-software/features/charting
- iDentalSoft charting (odontogram/perio/ortho): https://www.identalsoft.com/features/dental-charting-software
- Dentrix: https://www.dentrix.com/ · Asprodental one-page chart: https://www.asprodental.com/

**Physiotherapy workflow patterns (public product pages/guides)**
- Physio PM software roundups: https://softwarefinder.com/resources/best-physiotherapy-practice-management-software · https://www.noterro.com/blog/best-physical-therapy-practice-management-software
- SOAP note structure: https://www.writeupp.com/blog/soap-notes-for-physical-therapy · https://www.theraplatform.com/blog/478/physical-therapy-soap-note
- Session packages/outcome measures: https://medbus.org/products/physiotherapy-clinic · https://www.pteverywhere.com/practice-management-software

*All product ideas above were extracted from public marketing/documentation only. No proprietary UI, code, branding, or protected content has been reproduced.*
