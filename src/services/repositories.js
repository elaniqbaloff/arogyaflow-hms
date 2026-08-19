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
    tasks: crud('tasks', prim),
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
