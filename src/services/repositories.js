// ─────────────────────────────────────────────────────────────
// Repository layer.
//
// Gives the UI a clean, named, per-domain API instead of scattering
// raw add('collection', …) calls through components. Each repo is a
// thin factory over the generic dispatch primitives the store already
// exposes (add/update/remove + composite actions), so the store stays
// the single owner of state and persistence flows through the adapter.
//
// Usage in a component:
//   const { repos } = useHospital()
//   repos.patients.create({ … })
//   repos.tasks.complete(taskId)
//
// Swapping localStorage for a real backend later means changing the
// adapter + (optionally) making these async — call sites already speak
// in domain verbs, not storage details.
// ─────────────────────────────────────────────────────────────

import { uid, today } from '../lib/utils'
import { buildAudit, buildTask } from './workflow'
import { ORDER_SETS } from '../data/orderSets'
import { LAB_PANELS } from '../data/labPanels'

// Generic CRUD factory bound to a collection name.
function crud(collection, prim) {
  return {
    all: () => prim.getState()[collection] || [],
    byId: (id) => (prim.getState()[collection] || []).find((r) => r.id === id),
    where: (pred) => (prim.getState()[collection] || []).filter(pred),
    create: (record) => {
      const id = record.id || uid(collection.slice(0, 3))
      prim.add(collection, { id, ...record })
      return id
    },
    update: (id, changes) => prim.update(collection, id, changes),
    remove: (id) => prim.remove(collection, id),
  }
}

// Build all repositories from the store's primitive actions.
// `prim` = { getState, add, update, remove, dispatch, ...composite }
export function buildRepositories(prim) {
  const base = {
    patients: crud('patients', prim),
    episodes: crud('episodes', prim),
    beds: crud('beds', prim),
    appointments: crud('appointments', prim),
    consultations: crud('consultations', prim),
    prescriptions: crud('prescriptions', prim),
    medicines: crud('medicines', prim),
    labTests: crud('labTests', prim),
    vitals: crud('vitals', prim),
    nursingNotes: crud('nursingNotes', prim),
    therapies: crud('therapies', prim),
    bills: crud('bills', prim),
    users: crud('users', prim),
    pricing: crud('pricing', prim),
    billableItems: crud('billableItems', prim),
    procedurePlans: crud('procedurePlans', prim),
    attachments: crud('attachments', prim),
    treatmentPlans: crud('treatmentPlans', prim),
    progressNotes: crud('progressNotes', prim),
    packages: crud('packages', prim),
    tasks: crud('tasks', prim),
    clinicalTerms: crud('clinicalTerms', prim),
    approvals: crud('approvals', prim),
    audit: crud('audit', prim),
    snapshots: crud('snapshots', prim),
  }

  // ── Domain extensions on top of generic CRUD ──

  // Records an audit row for a task lifecycle verb, same shape logAudit uses.
  const taskAudit = (user, action, task, oldValue, newValue, remarks) => {
    prim.add('audit', buildAudit({
      user, action, module: 'tasks', recordId: task.id, mrn: task.mrn,
      oldValue: oldValue ?? null, newValue: newValue ?? null, remarks: remarks || '',
    }))
  }

  // Package/session billing (§10.8), triggered from the generic
  // tasks.complete() verb below — not a dedicated physio verb — so the
  // billing effect fires identically no matter which UI completes the
  // task (Tasks.jsx, any Department Hub worklist, etc). Reads
  // plan/package once via byId() before its one dispatch, same
  // single-update discipline as completeItem's deriveItem (§5b).
  const applyPhysioSessionCompletion = (task, user) => {
    const appointment = (prim.getState().appointments || []).find((a) => a.id === task.relatedId)
    const plan = appointment?.treatmentPlanId ? base.treatmentPlans.byId(appointment.treatmentPlanId) : null
    if (!plan) return
    const now = new Date().toISOString()

    const pkg = plan.packageId ? base.packages.byId(plan.packageId) : null
    if (pkg) {
      const usedSessions = pkg.usedSessions + 1
      const remaining = pkg.totalSessions - usedSessions
      const status = remaining <= 0 ? 'exhausted' : pkg.status
      prim.update('packages', pkg.id, { usedSessions, status, updatedAt: now })
      prim.add('audit', buildAudit({
        user, action: 'package.session.used', module: 'packages', recordId: pkg.id, mrn: plan.mrn,
        oldValue: pkg.usedSessions, newValue: usedSessions,
        remarks: `${pkg.name} — ${Math.max(remaining, 0)} of ${pkg.totalSessions} sessions remaining`,
      }))
      if (remaining > 0 && remaining <= 2) {
        prim.add('tasks', buildTask({
          type: 'package-renewal', mrn: plan.mrn, sourceRole: 'system', createdBy: 'System',
          relatedId: pkg.id, notes: `${pkg.name} — only ${remaining} session(s) left for ${plan.diagnosis}`,
        }))
      }
    } else {
      // Pay-per-session fallback (§10.8) — same pending-billable-item
      // pattern completeItem uses for dental, priced off the standalone
      // per-session pricing row rather than a package lump sum.
      const sessionPrice = (prim.getState().pricing || []).find((p) => p.code === 'PHYS-SESSION')
      prim.add('billableItems', {
        id: uid('bi'), mrn: plan.mrn, patientId: plan.patientId, episodeId: null,
        department: 'Physiotherapy', desc: `Physiotherapy session — ${plan.diagnosis}`,
        priceId: sessionPrice?.id || null, amount: sessionPrice?.amount || 0,
        status: 'pending', createdAt: now, source: 'physio-session',
      })
    }
  }

  base.tasks = {
    ...base.tasks,
    open: () => base.tasks.where((t) => t.status === 'Pending' || t.status === 'In Progress'),
    forRole: (role) => base.tasks.where((t) => t.assignedRole === role),
    setStatus: (id, status) => prim.update('tasks', id, { status, updatedAt: new Date().toISOString() }),

    // Lock-safe lifecycle verbs. Every verb returns {ok, reason?} and never throws.
    accept: (id, user) => {
      const task = base.tasks.byId(id)
      if (!task) return { ok: false, reason: 'not-found' }
      if (task.acceptedBy) return { ok: false, reason: 'already-accepted' }
      const now = new Date().toISOString()
      prim.update('tasks', id, { acceptedBy: user?.name || null, acceptedAt: now, status: 'Accepted', updatedAt: now })
      taskAudit(user, 'task.accepted', task, task.status, 'Accepted')
      return { ok: true }
    },

    start: (id, user) => {
      const task = base.tasks.byId(id)
      if (!task) return { ok: false, reason: 'not-found' }
      if (!task.acceptedBy || task.acceptedBy !== user?.name) return { ok: false, reason: 'not-owner' }
      if (task.status !== 'Accepted') return { ok: false, reason: 'invalid-status' }
      const now = new Date().toISOString()
      prim.update('tasks', id, { startedAt: now, status: 'In Progress', updatedAt: now })
      taskAudit(user, 'task.started', task, task.status, 'In Progress')
      return { ok: true }
    },

    // Owner-only, except an unclaimed task can be completed in one tap —
    // that implicitly accepts + starts it for the completing user first.
    complete: (id, user) => {
      const task = base.tasks.byId(id)
      if (!task) return { ok: false, reason: 'not-found' }
      if (['Completed', 'Cancelled'].includes(task.status)) return { ok: false, reason: 'invalid-status' }
      if (task.acceptedBy && task.acceptedBy !== user?.name) return { ok: false, reason: 'not-owner' }
      const now = new Date().toISOString()
      prim.update('tasks', id, {
        status: 'Completed',
        completedAt: now,
        updatedAt: now,
        acceptedBy: task.acceptedBy || user?.name || null,
        acceptedAt: task.acceptedAt || now,
        startedAt: task.startedAt || now,
      })
      taskAudit(user, 'task.completed', task, task.status, 'Completed')
      if (task.type === 'physio-session') applyPhysioSessionCompletion(task, user)
      return { ok: true }
    },

    block: (id, user, reason) => {
      const task = base.tasks.byId(id)
      if (!task) return { ok: false, reason: 'not-found' }
      if (!task.acceptedBy || task.acceptedBy !== user?.name) return { ok: false, reason: 'not-owner' }
      if (!['Accepted', 'In Progress'].includes(task.status)) return { ok: false, reason: 'invalid-status' }
      const now = new Date().toISOString()
      prim.update('tasks', id, { status: 'Blocked', blockedReason: reason || '', updatedAt: now })
      taskAudit(user, 'task.blocked', task, task.status, 'Blocked', reason)
      return { ok: true }
    },

    unblock: (id, user) => {
      const task = base.tasks.byId(id)
      if (!task) return { ok: false, reason: 'not-found' }
      if (task.status !== 'Blocked') return { ok: false, reason: 'invalid-status' }
      if (!task.acceptedBy || task.acceptedBy !== user?.name) return { ok: false, reason: 'not-owner' }
      const now = new Date().toISOString()
      prim.update('tasks', id, { status: 'In Progress', blockedReason: null, updatedAt: now })
      taskAudit(user, 'task.unblocked', task, task.status, 'In Progress')
      return { ok: true }
    },

    // Clears the ownership lock and returns the task to the open pool.
    release: (id, user) => {
      const task = base.tasks.byId(id)
      if (!task) return { ok: false, reason: 'not-found' }
      if (['Completed', 'Cancelled'].includes(task.status)) return { ok: false, reason: 'invalid-status' }
      const now = new Date().toISOString()
      prim.update('tasks', id, {
        status: 'Pending', acceptedBy: null, acceptedAt: null, startedAt: null, blockedReason: null, updatedAt: now,
      })
      taskAudit(user, 'task.released', task, task.status, 'Pending')
      return { ok: true }
    },

    // Re-routes an unfinished task to a new department/role/user and clears
    // the previous lock so the new owner starts from a clean 'Pending' state.
    reassign: (id, user, { department, role, userId } = {}) => {
      const task = base.tasks.byId(id)
      if (!task) return { ok: false, reason: 'not-found' }
      if (['Completed', 'Cancelled'].includes(task.status)) return { ok: false, reason: 'invalid-status' }
      const now = new Date().toISOString()
      const changes = {
        status: 'Pending', acceptedBy: null, acceptedAt: null, startedAt: null, blockedReason: null, updatedAt: now,
      }
      if (department) changes.assignedDepartment = department
      if (role) changes.assignedRole = role
      if (userId !== undefined) changes.assignedUserId = userId
      prim.update('tasks', id, changes)
      taskAudit(user, 'task.reassigned', task,
        `${task.assignedDepartment || ''}/${task.assignedRole || ''}`,
        `${changes.assignedDepartment || task.assignedDepartment || ''}/${changes.assignedRole || task.assignedRole || ''}`)
      return { ok: true }
    },
  }

  // Records an audit row for a procedure-plan item verb, same shape logAudit uses.
  const planAudit = (user, action, plan, oldValue, newValue, remarks) => {
    prim.add('audit', buildAudit({
      user, action, module: 'procedurePlans', recordId: plan.id, mrn: plan.mrn,
      oldValue: oldValue ?? null, newValue: newValue ?? null, remarks: remarks || '',
    }))
  }

  // Item status is a one-way state machine — no ownership/claim concept
  // (a plan belongs to whichever clinician is managing that patient, gated
  // by capability, not per-item locking) but every verb still self-guards
  // the transition and returns {ok, reason?}, matching the tasks pattern.
  const ITEM_TRANSITIONS = {
    proposed: ['accepted', 'cancelled'],
    accepted: ['in-progress', 'cancelled'],
    'in-progress': ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  }

  // `deriveItem`, when given, lets a verb fold extra per-item changes (e.g.
  // completeItem's billableItemId) into the SAME dispatch as the status
  // transition — chaining a second prim.update after the first would read
  // stale pre-transition data back out of prim.getState()'s ref (it only
  // syncs after React commits), silently clobbering the transition.
  const transitionItem = (planId, itemId, toStatus, user, { extra = {}, deriveItem } = {}) => {
    const plan = base.procedurePlans.byId(planId)
    if (!plan) return { ok: false, reason: 'not-found' }
    const item = (plan.items || []).find((i) => i.id === itemId)
    if (!item) return { ok: false, reason: 'item-not-found' }
    if (!(ITEM_TRANSITIONS[item.status] || []).includes(toStatus)) return { ok: false, reason: 'invalid-status' }
    const now = new Date().toISOString()
    let nextItem = { ...item, ...extra, status: toStatus }
    if (deriveItem) nextItem = deriveItem(nextItem)
    const items = plan.items.map((i) => (i.id === itemId ? nextItem : i))
    prim.update('procedurePlans', planId, { items, updatedAt: now })
    planAudit(user, `procedurePlan.item.${toStatus}`, plan, item.status, toStatus, extra.reason)
    return { ok: true, item: nextItem, plan }
  }

  base.procedurePlans = {
    ...base.procedurePlans,

    acceptItem: (planId, itemId, user) =>
      transitionItem(planId, itemId, 'accepted', user, { extra: { acceptedAt: new Date().toISOString() } }),

    startItem: (planId, itemId, user) =>
      transitionItem(planId, itemId, 'in-progress', user, { extra: { startedAt: new Date().toISOString() } }),

    cancelItem: (planId, itemId, user, reason) =>
      transitionItem(planId, itemId, 'cancelled', user, { extra: { reason } }),

    // Completing an item auto-creates a pending billable item (§9.3) and,
    // if the item's sourcing consultation named a next-visit plan, raises a
    // dental-followup task carrying that plan as its notes (§9.8).
    completeItem: (planId, itemId, user) => {
      const billableItemId = uid('bi')
      const result = transitionItem(planId, itemId, 'completed', user, {
        extra: { completedAt: new Date().toISOString() },
        deriveItem: (item) => ({ ...item, billableItemId }),
      })
      if (!result.ok) return result
      const { item, plan } = result

      prim.add('billableItems', {
        id: billableItemId, mrn: plan.mrn, patientId: plan.patientId, episodeId: null,
        department: 'Dental', desc: item.procedureName || 'Dental procedure',
        priceId: item.priceId || null, amount: item.estAmount || 0,
        status: 'pending', createdAt: new Date().toISOString(), source: 'dental-procedure',
      })

      const consultation = item.consultationId
        ? (prim.getState().consultations || []).find((c) => c.id === item.consultationId)
        : null
      if (consultation?.nextVisitPlan?.trim()) {
        prim.add('tasks', buildTask({
          type: 'dental-followup', mrn: plan.mrn, sourceRole: user?.role, createdBy: user?.name || 'System',
          relatedId: plan.id, notes: consultation.nextVisitPlan,
        }))
      }

      return { ok: true, item }
    },

    // Smart Assist order set (SA-P3, §9.12): prefills several items in one
    // dispatch (same single-update discipline as completeItem above — read
    // pricing/plan once, build every item from that snapshot, one prim.update).
    // Items land as 'proposed', same as manually adding them one at a time —
    // the dentist still reviews, price-checks, and confirms (accepts) each.
    applyOrderSet: (planId, orderSetKey, { tooth, consultationId } = {}, user) => {
      const orderSet = ORDER_SETS[orderSetKey]
      if (!orderSet) return { ok: false, reason: 'unknown-order-set' }
      const plan = base.procedurePlans.byId(planId)
      if (!plan) return { ok: false, reason: 'not-found' }
      const pricing = prim.getState().pricing || []
      const now = new Date().toISOString()

      const newItems = orderSet.items.map((spec) => {
        const price = pricing.find((p) => p.code === spec.priceCode)
        return {
          id: uid('ppli'), tooth: tooth || null, priceId: price?.id || null,
          procedureName: price?.name || spec.priceCode, phase: spec.phase, status: 'proposed',
          estAmount: price?.amount || 0, consultationId: consultationId || null,
          acceptedAt: null, startedAt: null, completedAt: null, billableItemId: null,
        }
      })

      prim.update('procedurePlans', planId, { items: [...plan.items, ...newItems], updatedAt: now })
      planAudit(user, 'procedurePlan.orderSet.applied', plan, null, orderSetKey, `${orderSet.label}${tooth ? ` — tooth ${tooth}` : ''}`)
      return { ok: true, items: newItems }
    },

    // Plan-level, not per-item (§9.6): print → sign on paper → this marks
    // the plan's consentStatus with a staff attestation + audit entry.
    // Digital signature capture is a backend-era feature, out of scope here.
    signConsent: (planId, user) => {
      const plan = base.procedurePlans.byId(planId)
      if (!plan) return { ok: false, reason: 'not-found' }
      if (plan.consentStatus === 'signed') return { ok: false, reason: 'already-signed' }
      const now = new Date().toISOString()
      prim.update('procedurePlans', planId, {
        consentStatus: 'signed', consentSignedBy: user?.name || null, consentSignedAt: now, updatedAt: now,
      })
      planAudit(user, 'procedurePlan.consent.signed', plan, plan.consentStatus, 'signed')
      return { ok: true }
    },
  }

  const patientMrn = (patientId) => (prim.getState().patients || []).find((p) => p.id === patientId)?.mrn || null

  // Records an audit row for a lab-test lifecycle verb, same shape logAudit uses.
  const labAudit = (user, action, test, oldValue, newValue, remarks) => {
    prim.add('audit', buildAudit({
      user, action, module: 'lab', recordId: test.id, mrn: patientMrn(test.patientId),
      oldValue: oldValue ?? null, newValue: newValue ?? null, remarks: remarks || '',
    }))
  }

  // Sample-state pipeline (§11 Phase 7a): a one-way state machine, same
  // shape as procedurePlans' ITEM_TRANSITIONS above — capability-gated, no
  // per-record ownership/claim concept (a lab test belongs to whichever lab
  // tech is working the worklist, not a locked queue). Cancellable only
  // before a result exists, matching the dental "cancellable up to
  // in-progress" precedent — once resulted, the record is finalized data,
  // not something to silently discard.
  const LAB_TRANSITIONS = {
    ordered: ['collected', 'cancelled'],
    collected: ['resulted', 'cancelled'],
    resulted: ['acknowledged'],
    acknowledged: [],
    cancelled: [],
  }

  const transitionLabTest = (id, toStatus, user, extra = {}) => {
    const test = base.labTests.byId(id)
    if (!test) return { ok: false, reason: 'not-found' }
    if (!(LAB_TRANSITIONS[test.status] || []).includes(toStatus)) return { ok: false, reason: 'invalid-status' }
    const now = new Date().toISOString()
    prim.update('labTests', id, { ...extra, status: toStatus, updatedAt: now })
    labAudit(user, `labTest.${toStatus}`, test, test.status, toStatus, extra.reason)
    return { ok: true }
  }

  base.labTests = {
    ...base.labTests,
    collect: (id, user) => transitionLabTest(id, 'collected', user, { collectedAt: new Date().toISOString() }),
    // Critical flag (§11 Phase 7c) is captured manually at result-entry time
    // — there's no reference-range data model to auto-detect it against.
    // When set, raises a critical-lab task addressed to the SPECIFIC
    // ordering doctor (assignedUserId), not just their department, so it
    // reaches them regardless of who else works that department. Every
    // cross-collection lookup happens BEFORE transitionLabTest's dispatch —
    // reading prim.getState() again afterward would risk the stale-ref trap
    // documented under Phase 5b (the whole state ref goes stale for one
    // render cycle after any dispatch, not just the collection just written).
    resultEntry: (id, user, resultText, { critical = false } = {}) => {
      const test = base.labTests.byId(id)
      if (!test) return { ok: false, reason: 'not-found' }
      const patient = (prim.getState().patients || []).find((p) => p.id === test.patientId)
      const orderingDoctor = (prim.getState().users || []).find((u) => u.id === test.doctorId)
      const doctorDept = orderingDoctor
        ? (prim.getState().departments || []).find((d) => d.name === orderingDoctor.department)
        : null

      const result = transitionLabTest(id, 'resulted', user, {
        result: resultText, resultedAt: new Date().toISOString(), critical,
      })
      if (!result.ok) return result

      if (critical) {
        prim.add('tasks', buildTask({
          type: 'critical-lab', priority: 'Critical', mrn: patient?.mrn || null,
          sourceRole: user?.role, createdBy: user?.name || 'System',
          assignedUserId: test.doctorId, assignedDepartment: doctorDept?.code || null,
          relatedId: id, notes: `${test.testName} — CRITICAL: ${resultText} (${patient?.name || 'patient'})`,
        }))
      }
      return result
    },
    acknowledge: (id, user) => transitionLabTest(id, 'acknowledged', user, { acknowledgedAt: new Date().toISOString() }),
    cancel: (id, user, reason) => transitionLabTest(id, 'cancelled', user, { reason }),

    // Grouped ordering (§11 Phase 7b): creates one labTests record per test
    // in the panel, all in a single atomic prim.batch() (never a loop of
    // separate prim.add() calls — a partial batch would leave a half-ordered
    // panel if something failed mid-loop), tagged with a shared panelId so
    // the worklist can show which rows belong together. One consolidated
    // lab-request task covers the whole panel rather than one per test, to
    // avoid worklist noise — mirrors how a phlebotomist draws one tube per
    // panel, not one per analyte.
    orderPanel: (panelKey, { patientId, doctorId, requestedOn }, user) => {
      const panel = LAB_PANELS[panelKey]
      if (!panel) return { ok: false, reason: 'unknown-panel' }
      const panelId = uid('panel')
      const testIds = panel.tests.map(() => uid('lab'))
      const items = panel.tests.map((testName, i) => ({
        collection: 'labTests',
        record: {
          id: testIds[i], patientId, doctorId, episodeId: null, testName,
          department: 'Diagnostics', requestedOn: requestedOn || today(),
          status: 'ordered', result: '', panelId, panelLabel: panel.label,
        },
      }))
      prim.batch(items)

      const patient = (prim.getState().patients || []).find((p) => p.id === patientId)
      const mrn = patient?.mrn || null
      prim.add('tasks', buildTask({
        type: 'lab-request', mrn, sourceRole: user?.role, createdBy: user?.name || 'System',
        relatedId: panelId, notes: `${panel.label} (${panel.tests.length} tests) for ${patient?.name || 'patient'}`,
      }))
      prim.add('audit', buildAudit({
        user, action: 'labTest.panel.ordered', module: 'lab', recordId: panelId, mrn,
        oldValue: null, newValue: panelKey, remarks: panel.label,
      }))
      return { ok: true, panelId, testIds }
    },
  }

  base.approvals = {
    ...base.approvals,
    pending: () => base.approvals.where((a) => a.status === 'Pending'),
    decide: (id, decision, by, byRole, remarks) =>
      prim.update('approvals', id, {
        status: decision, decidedBy: by, decidedRole: byRole,
        decidedAt: new Date().toISOString(), remarks: remarks || '',
      }),
  }

  base.audit = {
    ...base.audit,
    recent: (n = 100) => [...base.audit.all()].sort((a, b) => b.at.localeCompare(a.at)).slice(0, n),
  }

  return base
}
