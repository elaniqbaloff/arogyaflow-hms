import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useCallback } from 'react'
import { reducer } from './reducer'
import { buildInitialState } from '../data/seed'
import { adapter, LEGACY_KEYS } from '../services/storageAdapter'
import { buildRepositories } from '../services/repositories'
import { buildAudit, buildTask, ROLE_DEPARTMENT } from '../services/workflow'

// v3: ArogyaFlow — added pricing/billableItems/tasks/approvals/audit/snapshots
// and a swappable storage adapter. State now flows through the adapter so a
// real backend can replace it without touching the UI.

const HospitalContext = createContext(null)

function loadState() {
  // Prefer the current adapter (v3).
  const current = adapter.read()
  if (current && current.episodes && current.beds) {
    return ensureCollections(current)
  }
  // One-time migration from a legacy key, if present.
  for (const key of LEGACY_KEYS) {
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && parsed.episodes && parsed.beds) return ensureCollections(parsed)
      }
    } catch { /* ignore */ }
  }
  return buildInitialState()
}

// Guarantee newer collections exist even when loading older saved state.
function ensureCollections(s) {
  const defaults = buildInitialState()
  const keys = ['pricing', 'billableItems', 'tasks', 'approvals', 'audit', 'snapshots',
    'patients', 'episodes', 'beds', 'appointments', 'consultations', 'prescriptions',
    'medicines', 'labTests', 'vitals', 'nursingNotes', 'therapies', 'bills', 'users',
    'doctors', 'nurses', 'departments']
  const merged = { ...s }
  for (const k of keys) if (!merged[k]) merged[k] = defaults[k] || []
  if (!merged.meta) merged.meta = defaults.meta
  merged.tasks = (merged.tasks || []).map(migrateTask)
  return merged
}

// Idempotent per-task migration: backfills ownership fields introduced for
// task ownership/lifecycle tracking. Leaves already-migrated tasks untouched.
function migrateTask(task) {
  if (task.assignedDepartment !== undefined && task.acceptedBy !== undefined) return task
  return {
    ...task,
    assignedDepartment: task.assignedDepartment ?? ROLE_DEPARTMENT[task.assignedRole] ?? null,
    assignedUserId: task.assignedUserId ?? null,
    acceptedBy: task.acceptedBy ?? null,
    acceptedAt: task.acceptedAt ?? null,
    startedAt: task.startedAt ?? null,
    completedAt: task.completedAt ?? null,
    blockedReason: task.blockedReason ?? null,
  }
}

export function HospitalProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  // Keep a live ref to state so repositories can read synchronously.
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  // Persist through the adapter on every change.
  useEffect(() => { adapter.write(state) }, [state])

  // ── Primitive dispatchers (the building blocks repos/actions use) ──
  const prim = useMemo(() => ({
    getState: () => stateRef.current,
    add: (collection, record) => dispatch({ type: 'add', collection, record }),
    update: (collection, id, changes) => dispatch({ type: 'update', collection, id, changes }),
    remove: (collection, id) => dispatch({ type: 'delete', collection, id }),
    batch: (items) => dispatch({ type: 'batch', items }),
    dispatch,
  }), [])

  // ── Audit + task helpers (used by composite actions and pages) ──
  const logAudit = useCallback((entry) => {
    dispatch({ type: 'add', collection: 'audit', record: buildAudit(entry) })
  }, [])

  const createTask = useCallback((spec) => {
    const task = buildTask(spec)
    dispatch({ type: 'add', collection: 'tasks', record: task })
    return task.id
  }, [])

  // ── Repositories ──
  const repos = useMemo(() => buildRepositories(prim), [prim])

  // ── Action creators (existing signatures preserved) ──
  const actions = useMemo(() => ({
    add: prim.add,
    update: prim.update,
    remove: prim.remove,
    batch: prim.batch,
    logAudit,
    createTask,
    repos,

    dispense: (prescriptionId) => dispatch({ type: 'dispensePrescription', prescriptionId }),
    admitPatient: (episode, bedId) => dispatch({ type: 'admitPatient', episode, bedId }),
    convertToIpd: (ipdEpisode, opdEpisodeId, bedId) =>
      dispatch({ type: 'convertToIpd', ipdEpisode, opdEpisodeId, bedId }),
    transferBed: (episodeId, toBedId, reason, date) =>
      dispatch({ type: 'transferBed', episodeId, toBedId, reason, date }),
    dischargePatient: (episodeId, dischargeDate) =>
      dispatch({ type: 'dischargePatient', episodeId, dischargeDate }),

    // Discharge clearance
    clearGate: (episodeId, gate, by) => dispatch({ type: 'clearGate', episodeId, gate, by }),
    overrideDischarge: (episodeId, by, role, reason) =>
      dispatch({ type: 'overrideDischarge', episodeId, by, role, reason }),

    // Approvals
    decideApproval: (id, decision, by, byRole, remarks) =>
      dispatch({ type: 'update', collection: 'approvals', id,
        changes: { status: decision, decidedBy: by, decidedRole: byRole, decidedAt: new Date().toISOString(), remarks: remarks || '' } }),

    // Demo data tools
    reseed: () => dispatch({ type: 'reseed', state: buildInitialState() }),
    importState: (incoming) => dispatch({ type: 'importState', state: ensureCollections(incoming) }),
    exportState: () => JSON.stringify(stateRef.current, null, 2),
  }), [prim, repos, logAudit, createTask])

  const value = useMemo(() => ({ state, ...actions }), [state, actions])
  return <HospitalContext.Provider value={value}>{children}</HospitalContext.Provider>
}

export function useHospital() {
  const ctx = useContext(HospitalContext)
  if (!ctx) throw new Error('useHospital must be used within HospitalProvider')
  return ctx
}

export function useLookups() {
  const { state } = useHospital()
  return useMemo(() => {
    const patientById = Object.fromEntries(state.patients.map((p) => [p.id, p]))
    const doctorById = Object.fromEntries(state.doctors.map((d) => [d.id, d]))
    const nurseById = Object.fromEntries((state.nurses || []).map((n) => [n.id, n]))
    return {
      patientById, doctorById, nurseById,
      patientName: (id) => patientById[id]?.name || 'Unknown',
      doctorName: (id) => doctorById[id]?.name || 'Unassigned',
      nurseName: (id) => nurseById[id]?.name || 'Unassigned',
      episodesFor: (patientId) => state.episodes.filter((e) => e.patientId === patientId),
      activeIpdFor: (patientId) =>
        state.episodes.find((e) => e.patientId === patientId && e.type === 'IPD' && e.status === 'admitted'),
    }
  }, [state.patients, state.doctors, state.nurses, state.episodes])
}
