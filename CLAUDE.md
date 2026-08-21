# ArogyaFlow — Project Context for Claude

This file is read automatically by Claude Code at the start of every session
in this repo. If you're a Claude session picking this up on a new machine
(e.g. a collaborator's), **read this whole file before making changes** — it
tells you what's been built, why, and the hard-won rules that keep the
codebase from breaking in non-obvious ways.

**Working principle for this repo: prefer additive, careful changes over
replacing or removing existing patterns.** A lot of the structure here (the
repository layer, the task lock-safety rules, the department config model)
exists because an earlier, simpler version of it caused real bugs. If
something here looks over-engineered, read the rationale before simplifying
it — the reasoning is usually documented right next to the code, or below.

---

## 1. What this project is

**ArogyaFlow** — a connected hospital operations platform for Dr. P.
Alikutty's Ayurveda & Modern Hospital, Kottakkal. Built by Elan Iqbal, with
his cousin (a doctor) now also contributing — bringing clinical/operational
domain knowledge to inform how workflows should actually behave.

The **master specification** is
[`docs/arogyaflow-product-blueprint.md`](docs/arogyaflow-product-blueprint.md)
— a ~900-line document covering the product vision, RBAC matrix, task
ownership model, department engine, Smart Assist (clinical autocomplete)
design, per-specialty module plans (Dental, Physiotherapy, Diagnostics), the
Patient Journey Tracker, the Management Command Center, and the full 13-phase
implementation roadmap (§13). **When in doubt about intended behavior, check
the blueprint first** — most design decisions trace back to a specific
section of it.

## 2. Current status — what's built

**Phases 0 through 9 of the blueprint are fully complete**, all on branch
`audit-and-ui-foundation`. In order:

- **Phase 0** — stability fixes (login reads `state.users` not seed; patient
  archive instead of hard-delete).
- **Phase 1** — task ownership: lock-safe lifecycle verbs (accept/start/
  complete/block/unblock/release/reassign), central `taskPolicy.js` RBAC.
- **Phase 2** — UI 2.0: sidebar groups + status-chip system, Topbar global
  search.
- **Phase 2.5 / 3** — Clinical Smart Assist v1 (curated dictionary +
  suggestion engine + `SmartField` autocomplete) and the Department Engine
  (config-driven departments, `dentist`/`physiotherapist` roles, scope layer).
- **Phase 4** — generic `/departments/:code` Department Hub (KPIs, worklist,
  today's appointments) that every specialty module builds on.
- **Phase 5 (Dental/ALIDS)** — dental consultation template, FDI tooth
  picker, `procedurePlans` (lock-safe procedure lifecycle), bilingual consent
  docs, Dental Reports, dental Smart Assist pack + RCT order set.
- **Phase 6 (Physiotherapy)** — physio assessment template, `treatmentPlans`
  + session scheduling, progress notes + pain/ROM trend charts,
  package/session billing, outcome tracking, physio Smart Assist pack +
  rehab order sets.
- **Phase 7 (Diagnostics/Lab)** — lab sample-state pipeline (ordered →
  collected → resulted → acknowledged), panel ordering, critical-result
  flow to the ordering doctor, Diagnostics TAT reports, and a
  doctor/admin-managed dictionary UI in Settings (the dictionary is a real
  editable collection now, not just a static seed file).
- **Phase 8 (Patient Journey Tracker)** — `services/journey.js` builds a
  merged cross-department timeline per patient; the Journey tab has
  department-colored dots, filter chips, click-through; an "active journey
  strip" on the patient header shows currently-open items; a discharge
  readiness card mirrors the IPD discharge-clearance state.
- **Phase 9 (Management Command Center)** — a dedicated `/command-center`
  page management lands on: hospital pulse, flow & delays, department
  load/bottlenecks, clinical ops + staff workload, and an alerts rail.

**Post-Phase-9 fix (not a blueprint phase, a standalone bug)** — the
`billableItems` collection (pending charges pushed by dental procedure
completion, physio pay-per-session billing, and two seeded therapy/nursing
rows) was **write-only**: nothing ever read it, so completed work silently
never reached an invoice. `src/pages/Billing.jsx` now has a **Pending
Items** card (only rendered when pending items exist) that lists them,
lets staff generate/select into a pre-filled invoice, and marks the
source item `status: 'invoiced'` with a `billId` reference once billed.
If you add a new `billableItems` producer anywhere, it'll show up here
automatically — no additional wiring needed.

**Phase 10 (backend/security/compliance readiness) has NOT been started.**
This is the move from the current localStorage-only demo to a real backend
with a database, real authentication, and server-enforced permissions. There
is already substantial **planning** for this in `docs/` (see §7 below) —
none of it has been executed yet. Don't start it without a real discussion
first: it needs infrastructure decisions (hosting, database, auth provider)
and — per the blueprint's own note — NABH-compliance input from someone
qualified to give it, not an AI guess.

## 3. Tech stack

- **Vite + React 18**, plain JSX (no TypeScript)
- **React Router 6** — per-module route guards (`RequireModule`,
  `RequireDepartment`)
- **Tailwind CSS** — Ayurveda-green + saffron-gold palette
- **Recharts** for charts, **lucide-react** for icons
- **State**: React Context + `useReducer`, persisted to `localStorage`
  (key `arogyaflow-state-v3`) via a swappable adapter — no backend required
  to run the app today

```bash
npm install
npm run dev      # dev server
npm run build    # production build — ALWAYS run this before considering a change done
```

## 4. Architecture — the data layers

```
UI components (src/pages/*, src/components/*)
   └── repositories.js      (named per-domain verbs: repos.patients.create, repos.tasks.complete, ...)
         └── HospitalContext.jsx + reducer.js   (single owner of state, dispatch primitives)
               └── storageAdapter.js            (the ONLY module touching localStorage — the future backend swap point)
```

Components never touch `localStorage` or the reducer directly — they call
`repos.<collection>.<verb>()`. This is what makes Phase 10 (swap to a real
backend) possible without a UI rewrite: only `storageAdapter.js` and the
verbs inside `repositories.js` need to change to async/network calls.

## 5. Critical rules — read before touching `repositories.js` or `HospitalContext.jsx`

These are not stylistic preferences. Each one below caused a real, shipped
bug earlier in this project before the rule was written down.

### 5.1 The stale-ref rule

`HospitalContext.jsx` keeps a `stateRef` that a `useEffect` only syncs
**after React commits a render**. This means:

- `repos.<collection>.byId()/.where()/.all()` are **safe to call once,
  synchronously, at the very start of a verb**, before any dispatch in that
  same function.
- They are **NOT safe to call again after a `prim.update()`/`prim.add()`**
  earlier in the same function — you'll read pre-dispatch, stale data and
  silently clobber your own change.
- They are **NOT safe to use as a data source for `useMemo`/render logic** —
  use `state.<collection>` from `useHospital()` context directly for
  anything that renders. `repos.*` reads are for verbs (mutations), never
  for deriving what's on screen.

If a verb needs to fold multiple pieces of data into one record update,
gather everything from `byId()`/`getState()` reads **before** the first
dispatch, then issue exactly **one** `prim.update()` per verb call (see
`transitionItem`'s `deriveItem` option in `repositories.js` for the
established pattern).

### 5.2 Department `code` vs `name` — check which one you have

Department identity is stored two different ways depending on which
collection you're in, and this has caused real bugs more than once:

- `procedurePlans`, `treatmentPlans`, `tasks.assignedDepartment` already
  store the department **code** (e.g. `'DENT'`, `'PHYS'`) directly.
- `patients.department`, `episodes.department`, `appointments.department`,
  `consultations.department`, `labTests.department`, `bills.department`
  store the department **display name** (e.g. `'Dental'`,
  `'Physiotherapy'`) — you need `state.departments.find(d => d.name === x)`
  to get the code.

`services/journey.js`'s `codeForDeptName()` helper is the established
resolver for the name→code direction — reuse it (or its pattern) rather
than assuming a `department` field is already a code.

### 5.3 Task lifecycle: generic verb vs. dedicated verb

When a task type needs a side effect on completion (billing, unlocking a
follow-up, etc.), first check whether it rides the **generic** task
lifecycle (completable from `Tasks.jsx` **or** any Department Hub) or has
its **own dedicated** lifecycle verb (like `procedurePlans.completeItem()`):

- **Generic lifecycle** → the side effect must live inside the generic
  `repos.tasks.complete()` verb via a narrow, type-checked branch (see
  `applyPhysioSessionCompletion` in `repositories.js`) — otherwise
  completing the same task from a different screen silently skips the
  effect.
- **Dedicated verb** → hang the logic directly off that verb instead.

Picking the wrong one either leaks domain logic into the generic verb, or
creates a UI-dependent correctness gap.

### 5.4 "Order set" doesn't always mean the same thing

Dental's order sets (`data/orderSets.js`) insert procedure-plan **items**
into an **already-existing** plan via a dedicated verb
(`procedurePlans.applyOrderSet()`) — a real data mutation. Physio's rehab
order sets (`data/rehabOrderSets.js`) and lab panels (`data/labPanels.js`)
prefill fields on a **not-yet-created** record — a plain form-fill (or, for
lab panels, a single atomic `prim.batch()` across several new records), no
repo verb involved until the user actually saves. Check which shape you're
actually in before copying either pattern to a new department.

### 5.5 A collection with writers but no readers can hide in plain sight

`billableItems` accumulated real data (seed rows + a dental-completion
hook) for multiple phases before anyone noticed nothing ever read it —
see the "Post-Phase-9 fix" note in §2. Before adding a new producer to an
existing collection (or when auditing one you didn't build), grep the
whole `src/` tree for it and confirm something actually consumes what
you're about to write — a write-only collection is a silent no-op feature,
not a working one.

### 5.6 Always verify against a production build

`npm run dev`'s HMR occasionally throws a harmless
`"useHospital must be used within HospitalProvider"` console error during
rapid file edits — this is a known dev-server artifact, not a real bug. If
a console error looks inconsistent with otherwise-correct page behavior,
confirm against `npm run build` + a static preview before treating it as
real. Conversely, **do** treat every *other* console error as real.

## 6. Where things live (quick map)

| Concern | File(s) |
|---|---|
| RBAC (roles, modules, capabilities) | `src/config/roles.js` |
| Task ownership rules | `src/services/taskPolicy.js` |
| Record-level scoping (who sees which patients) | `src/services/accessPolicy.js` |
| Task routing/types, audit builder | `src/services/workflow.js` |
| Repository verbs (all mutations) | `src/services/repositories.js` |
| Department config + name/code resolution | `src/config/departmentUtils.js` |
| Consultation form field registry per department | `src/config/consultationTemplates.js` |
| Discharge clearance gates | `src/services/discharge.js` |
| Patient journey timeline + active-strip builders | `src/services/journey.js` |
| Clinical dictionary (now DB-backed, not static) | `src/data/clinicalDictionary.js` (seed only) + `state.clinicalTerms` (live) |
| Suggestion engine | `src/services/smartAssist.js` |
| Autocomplete input component | `src/components/ui/SmartField.jsx` |
| Dental procedure-plan panel | `src/components/dental/ProcedurePlanPanel.jsx` |
| Physio treatment-plan panel | `src/components/physio/TreatmentPlanPanel.jsx` |
| FDI tooth picker | `src/components/ui/ToothPicker.jsx` |
| Management dashboard | `src/pages/CommandCenter.jsx` |
| Generic per-department hub | `src/pages/DepartmentHub.jsx` |
| Billing + Pending Items (billableItems consumer) | `src/pages/Billing.jsx` |
| Status→color tone maps | `src/config/statusTones.js` |
| Sidebar nav config | `src/config/navigation.js` |

## 7. The `docs/` folder — two different kinds of document

- **`arogyaflow-product-blueprint.md`** — the master spec Phases 0-9 were
  built against. Still the source of truth for intended behavior.
- **`BACKEND_ROADMAP.md`, `DATABASE_SCHEMA.md`, `API_CONTRACT.md`,
  `SECURITY.md`, `MULTI_TENANT.md`, `DEPLOYMENT.md`** — a **pre-existing,
  not-yet-executed** plan for Phase 10, written before Phases 0-9 were
  built. It recommends Supabase (Postgres + Auth + Storage + Row-Level
  Security) and a staged, non-breaking migration through the
  `storageAdapter` seam described in §4 above. Nothing in these docs has
  been implemented — they're the starting point **when** Phase 10 begins,
  not a status report.

**`README.md` at the repo root is stale** — it describes the app as it
stood *before* the blueprint's Phases 0-9 (its "Known limitations /
deferred" and "Recommended next phase" sections list things that are
actually done now, e.g. task auto-generation, lab workflow depth, dental/
physio roles). Don't treat it as current status; this file (`CLAUDE.md`) and
the blueprint are the accurate source. Worth a rewrite pass at some point,
but that's a separate task from anything above.

## 8. Working conventions on this project

- **Verify every change against a running app**, not just a clean build —
  `npm run build` catches syntax errors but not broken behavior. Test the
  actual feature (log in as the relevant role if it's role-gated) before
  calling something done.
- **One phase-step per commit**, with a commit message explaining what
  changed, why, and what was verified — scan `git log` on this branch for
  the established style.
- **Demo login credentials** (all roles, password pattern shown):

  | Role | Email | Password |
  |---|---|---|
  | Admin | admin@palikutty.in | admin123 |
  | Management | management@palikutty.in | manage123 |
  | Doctor (Ayurveda) | doctor@palikutty.in | doctor123 |
  | Doctor (Allopathy) | reema@palikutty.in | doctor123 |
  | Dentist | dentist@palikutty.in | dentist123 |
  | Physiotherapist | physio@palikutty.in | physio123 |
  | Nurse | nurse@palikutty.in | nurse123 |
  | Reception | reception@palikutty.in | reception123 |
  | Pharmacy | pharmacy@palikutty.in | pharma123 |
  | Lab / Diagnostics | lab@palikutty.in | lab123 |
  | Finance | finance@palikutty.in | finance123 |
  | IT | it@palikutty.in | it123 |

- To reset demo data to seed: **Settings → Demo Data → Reset to seed**
  (Admin/IT only), or clear the `arogyaflow-state-v3` localStorage key.

## 9. If you're picking this up fresh

1. Read the blueprint (§1-2 for vision, §13 for the phase roadmap) before
   Phase 5 onward — most later phases assume the engine/RBAC/task-ownership
   work from Phases 0-4.
2. Read §5 above (the critical rules) before touching `repositories.js`.
3. Check `git log --oneline` on `audit-and-ui-foundation` for the detailed
   commit-by-commit history — every phase step has its own commit with a
   verification summary in the message body.
4. If continuing toward Phase 10, start with `docs/BACKEND_ROADMAP.md`, and
   raise the infrastructure/compliance questions with the project owner
   before writing migration code.
