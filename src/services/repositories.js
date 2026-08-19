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
import { buildAudit } from './workflow'

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
