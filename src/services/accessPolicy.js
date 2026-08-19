// ─────────────────────────────────────────────────────────────
// Department-scoped access policy for list pages. scopeFilter(user,
// state, domain) returns a predicate a page's list-building code can
// filter with, driven by each role's `scopes` config in roles.js. This
// is the frontend layer of the model docs/SECURITY.md describes — the
// eventual database RLS is the real boundary, this just keeps the UI
// honest about it in the meantime. Pure functions; no state, no dispatch.
// ─────────────────────────────────────────────────────────────

import { ROLES } from '../config/roles'

// Department-name strings (as stored on users[].department) that don't
// match one of the seeded clinical department names — mapped to the
// closest operational department code instead.
const LEGACY_DEPARTMENT_CODES = {
  'Administration': 'ADMIN',
  'Management': 'ADMIN',
  'IPD Nursing': 'IPD',
  'Front Desk': 'FRONT',
  'Pharmacy': 'PHAR',
  'Finance': 'FIN',
  'IT': 'ADMIN',
}

function departmentCodeForName(name, state) {
  if (!name) return null
  const match = (state.departments || []).find((d) => d.name === name)
  if (match) return match.code
  return LEGACY_DEPARTMENT_CODES[name] || null
}

// Resolves a user's own department (users[].department) to a department
// code, trying the live department config before the legacy map.
export function userDepartmentCode(user, state) {
  return departmentCodeForName(user?.department, state)
}

function roleScope(user, domain) {
  return ROLES[user?.role]?.scopes?.[domain]
}

// Does this patient have any tie — registration, episode, appointment or
// task — to the given department code?
function patientTouchesDepartment(patient, deptCode, state) {
  if (!patient || !deptCode) return false
  if (departmentCodeForName(patient.department, state) === deptCode) return true
  if ((state.episodes || []).some((e) => e.patientId === patient.id && departmentCodeForName(e.department, state) === deptCode)) return true
  if ((state.appointments || []).some((a) => a.patientId === patient.id && departmentCodeForName(a.department, state) === deptCode)) return true
  return (state.tasks || []).some((t) => t.mrn === patient.mrn && t.assignedDepartment === deptCode)
}

/**
 * Returns a predicate over records in `domain` ('patients' | 'appointments'
 * | 'consultations' | 'tasks') reflecting the given user's scope for that
 * domain, per their role's `scopes` config in roles.js:
 *  - 'all': every record.
 *  - 'department': records tied to the user's own department.
 *  - 'own': records created by / assigned to the user themself.
 * Unrecognised users, domains or scopes deny by default (empty list)
 * rather than silently showing everything.
 */
export function scopeFilter(user, state, domain) {
  if (!user) return () => false
  const scope = roleScope(user, domain)
  if (scope === 'all') return () => true
  if (scope !== 'department' && scope !== 'own') return () => false

  if (scope === 'department') {
    const deptCode = userDepartmentCode(user, state)
    if (!deptCode) return () => false
    switch (domain) {
      case 'patients':
        return (patient) => patientTouchesDepartment(patient, deptCode, state)
      case 'appointments':
        return (appt) => departmentCodeForName(appt.department, state) === deptCode
      case 'consultations':
        return (consult) => {
          const patient = (state.patients || []).find((p) => p.id === consult.patientId)
          return departmentCodeForName(patient?.department, state) === deptCode
        }
      case 'tasks':
        return (task) => task.assignedDepartment === deptCode
      default:
        return () => false
    }
  }

  // scope === 'own'
  switch (domain) {
    case 'appointments':
      return (appt) => appt.doctorId === user.id
    case 'consultations':
      return (consult) => consult.doctorId === user.id
    case 'tasks':
      return (task) => task.assignedUserId === user.id || task.acceptedBy === user.name
    default:
      // 'patients' has no single owner field in this data model.
      return () => false
  }
}
