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

  base.tasks = {
    ...base.tasks,
    open: () => base.tasks.where((t) => t.status === 'Pending' || t.status === 'In Progress'),
    forRole: (role) => base.tasks.where((t) => t.assignedRole === role),
    setStatus: (id, status) => prim.update('tasks', id, { status, updatedAt: new Date().toISOString() }),
    complete: (id) => prim.update('tasks', id, { status: 'Completed', updatedAt: new Date().toISOString() }),
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
