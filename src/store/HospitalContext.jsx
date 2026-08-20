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
  const keys = ['pricing', 'billableItems', 'procedurePlans', 'attachments', 'treatmentPlans', 'progressNotes', 'tasks', 'approvals', 'audit', 'snapshots',
    'patients', 'episodes', 'beds', 'appointments', 'consultations', 'prescriptions',
    'medicines', 'labTests', 'vitals', 'nursingNotes', 'therapies', 'bills', 'users',
    'doctors', 'nurses', 'departments', 'clinicalTerms']
  const merged = { ...s }
  for (const k of keys) if (!merged[k]) merged[k] = defaults[k] || []
  if (!merged.meta) merged.meta = defaults.meta
  merged.tasks = (merged.tasks || []).map(migrateTask)
  merged.departments = (merged.departments || []).map((d) => migrateDepartment(d, defaults.departments))
  return merged
}

// Fallback values for a persisted department with no seed match at all
// (e.g. a custom department a user added before this migration existed).
const DEPARTMENT_FALLBACK = {
  category: 'support', color: 'slate', icon: 'Building2',
  appointmentTypes: ['Consultation'], consultationTemplate: 'common', active: true,
  dictionaryScopes: ['symptoms'],
}

// Idempotent per-department migration: backfills the config fields the
// department engine needs (code/category/color/icon/appointmentTypes/
// consultationTemplate/active/dictionaryScopes), matching legacy records by
// id against the current seed. Leaves already-migrated departments untouched.
function migrateDepartment(dept, seedDepartments) {
  const hasAllFields = ['code', 'category', 'color', 'icon', 'appointmentTypes', 'consultationTemplate', 'active', 'dictionaryScopes']
    .every((k) => dept[k] !== undefined)
  if (hasAllFields) return dept
  const seedMatch = (seedDepartments || []).find((d) => d.id === dept.id) || {}
  return {
    ...dept,
    code: dept.code ?? seedMatch.code ?? dept.id?.toUpperCase(),
    category: dept.category ?? seedMatch.category ?? DEPARTMENT_FALLBACK.category,
    color: dept.color ?? seedMatch.color ?? DEPARTMENT_FALLBACK.color,
    icon: dept.icon ?? seedMatch.icon ?? DEPARTMENT_FALLBACK.icon,
    appointmentTypes: dept.appointmentTypes ?? seedMatch.appointmentTypes ?? DEPARTMENT_FALLBACK.appointmentTypes,
    consultationTemplate: dept.consultationTemplate ?? seedMatch.consultationTemplate ?? DEPARTMENT_FALLBACK.consultationTemplate,
    active: dept.active ?? seedMatch.active ?? DEPARTMENT_FALLBACK.active,
    dictionaryScopes: dept.dictionaryScopes ?? seedMatch.dictionaryScopes ?? DEPARTMENT_FALLBACK.dictionaryScopes,
  }
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
