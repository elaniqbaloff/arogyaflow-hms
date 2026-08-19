import { uid } from '../lib/utils'

// ─────────────────────────────────────────────────────────────
// One reducer drives all mutations. Generic CRUD per collection,
// plus a few composite actions that touch multiple collections
// (the kind of thing a backend endpoint would own as a transaction).
// ─────────────────────────────────────────────────────────────

const collections = [
  'patients', 'episodes', 'beds', 'appointments', 'consultations', 'prescriptions',
  'medicines', 'labTests', 'vitals', 'nursingNotes', 'therapies', 'bills', 'users',
  'pricing', 'billableItems', 'procedurePlans', 'attachments', 'tasks', 'approvals', 'audit', 'snapshots',
]

export function reducer(state, action) {
  switch (action.type) {
    case 'add': {
      const { collection, record } = action
      const withId = { id: record.id || uid(collection.slice(0, 3)), ...record }
      return { ...state, [collection]: [withId, ...(state[collection] || [])] }
    }

    case 'update': {
      const { collection, id, changes } = action
      return {
        ...state,
        [collection]: (state[collection] || []).map((r) => (r.id === id ? { ...r, ...changes } : r)),
      }
    }

    case 'delete': {
      const { collection, id } = action
      return { ...state, [collection]: (state[collection] || []).filter((r) => r.id !== id) }
    }

    // Append-only batch: add several records across collections atomically.
    // payload: { items: [{ collection, record }, …] }
    case 'batch': {
      let next = state
      for (const { collection, record } of action.items) {
        const withId = { id: record.id || uid(collection.slice(0, 3)), ...record }
        next = { ...next, [collection]: [withId, ...(next[collection] || [])] }
      }
      return next
    }

    // Dispense a prescription → mark dispensed + reduce stock per item.
    case 'dispensePrescription': {
      const { prescriptionId } = action
      const rx = state.prescriptions.find((p) => p.id === prescriptionId)
      if (!rx) return state
      const medicines = state.medicines.map((m) => {
        const item = rx.items.find((i) => i.medicineId === m.id)
        return item ? { ...m, stock: Math.max(0, m.stock - (item.qty || 0)) } : m
      })
      const prescriptions = state.prescriptions.map((p) =>
        p.id === prescriptionId ? { ...p, status: 'dispensed' } : p
      )
      return { ...state, medicines, prescriptions }
    }

    // Admit a patient to a bed → create IPD episode + occupy bed.
    // payload: { patientId, mrn, bedId, episode }
    case 'admitPatient': {
      const { episode, bedId } = action
      const epId = episode.id || uid('ep')
      const fullEp = { id: epId, ...episode, bedId, type: 'IPD', status: 'admitted' }
      const beds = state.beds.map((b) =>
        b.id === bedId ? { ...b, status: 'occupied', patientId: episode.patientId, episodeId: epId } : b
      )
      return { ...state, episodes: [fullEp, ...state.episodes], beds }
    }

    // Convert an OPD episode → IPD (SAME patient, SAME MRN, no duplicate).
    // payload: { patient, opdEpisodeId, ipdEpisode, bedId }
    case 'convertToIpd': {
      const { ipdEpisode, opdEpisodeId, bedId } = action
      const epId = ipdEpisode.id || uid('ep')
      const fullEp = {
        id: epId, ...ipdEpisode, bedId, type: 'IPD', status: 'admitted', convertedFrom: opdEpisodeId,
      }
      const episodes = state.episodes.map((e) =>
        e.id === opdEpisodeId ? { ...e, status: 'closed' } : e
      )
      const beds = state.beds.map((b) =>
        b.id === bedId ? { ...b, status: 'occupied', patientId: ipdEpisode.patientId, episodeId: epId } : b
      )
      return { ...state, episodes: [fullEp, ...episodes], beds }
    }

    // Transfer an admitted patient to another bed → record history.
    // payload: { episodeId, toBedId, reason, date }
    case 'transferBed': {
      const { episodeId, toBedId, reason, date } = action
      const ep = state.episodes.find((e) => e.id === episodeId)
      if (!ep) return state
      const fromBed = state.beds.find((b) => b.id === ep.bedId)
      const toBed = state.beds.find((b) => b.id === toBedId)
      const beds = state.beds.map((b) => {
        if (b.id === ep.bedId) return { ...b, status: 'cleaning', patientId: null, episodeId: null }
        if (b.id === toBedId) return { ...b, status: 'occupied', patientId: ep.patientId, episodeId }
        return b
      })
      const episodes = state.episodes.map((e) =>
        e.id === episodeId
          ? {
              ...e, bedId: toBedId, ward: toBed?.ward || e.ward,
              transfers: [...(e.transfers || []), { from: fromBed?.ward || e.ward, to: toBed?.ward, date, reason }],
            }
          : e
      )
      return { ...state, episodes, beds }
    }

    // Discharge an admitted patient → free bed, close episode.
    // payload: { episodeId, dischargeDate }
    case 'dischargePatient': {
      const { episodeId, dischargeDate } = action
      const ep = state.episodes.find((e) => e.id === episodeId)
      if (!ep) return state
      const beds = state.beds.map((b) =>
        b.id === ep.bedId ? { ...b, status: 'cleaning', patientId: null, episodeId: null } : b
      )
      const episodes = state.episodes.map((e) =>
        e.id === episodeId ? { ...e, status: 'discharged', dischargeDate } : e
      )
      return { ...state, episodes, beds }
    }

    // Mark one discharge-clearance gate done on an episode.
    // payload: { episodeId, gate, by }
    case 'clearGate': {
      const { episodeId, gate, by } = action
      const episodes = state.episodes.map((e) => {
        if (e.id !== episodeId) return e
        const clearance = { ...(e.clearance || {}) }
        clearance[gate] = { done: true, by: by || null, at: new Date().toISOString() }
        return { ...e, clearance }
      })
      return { ...state, episodes }
    }

    // Record an admin/management override on discharge gating.
    // payload: { episodeId, by, role, reason }
    case 'overrideDischarge': {
      const { episodeId, by, role, reason } = action
      const episodes = state.episodes.map((e) =>
        e.id === episodeId
          ? { ...e, clearance: { ...(e.clearance || {}), override: { by, role, reason, at: new Date().toISOString() } } }
          : e
      )
      return { ...state, episodes }
    }

    case 'reseed':
      return action.state

    // Replace whole state from an imported snapshot/JSON.
    case 'importState':
      return action.state

    default:
      if (action.collection && !collections.includes(action.collection)) {
        console.warn('Unknown collection in action', action)
      }
      return state
  }
}
