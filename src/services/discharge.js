// ─────────────────────────────────────────────────────────────
// IPD discharge clearance — a multi-step workflow that keeps
// MEDICAL discharge separate from FINANCIAL discharge.
//
// An episode carries a `clearance` object tracking each gate.
// Final discharge is blocked until required gates pass, unless an
// Admin/Management override is recorded with a reason (audited).
// ─────────────────────────────────────────────────────────────

export const DISCHARGE_STATUS = {
  active: 'Active IPD',
  clinicalReady: 'Clinical discharge ready',
  nursingPending: 'Nursing clearance pending',
  pharmacyPending: 'Pharmacy clearance pending',
  labPending: 'Lab clearance pending',
  billingPending: 'Billing pending',
  financiallyCleared: 'Financially cleared',
  documentsReady: 'Discharge documents ready',
  discharged: 'Discharged',
}

// Ordered gates. Each must be cleared (or overridden) before discharge.
export const CLEARANCE_GATES = [
  { key: 'clinical', label: 'Clinical discharge (Doctor)', role: 'doctor' },
  { key: 'nursing', label: 'Nursing clearance', role: 'nurse' },
  { key: 'pharmacy', label: 'Pharmacy clearance', role: 'pharmacy' },
  { key: 'lab', label: 'Lab clearance', role: 'lab' },
  { key: 'billing', label: 'Finance billing clearance', role: 'finance' },
  { key: 'documents', label: 'Discharge documents (Reception)', role: 'reception' },
]

export const emptyClearance = () => ({
  clinical: { done: false, by: null, at: null },
  nursing: { done: false, by: null, at: null },
  pharmacy: { done: false, by: null, at: null },
  lab: { done: false, by: null, at: null },
  billing: { done: false, by: null, at: null },
  documents: { done: false, by: null, at: null },
  override: null, // { by, role, reason, at }
})

export function clearanceProgress(clearance) {
  if (!clearance) return { done: 0, total: CLEARANCE_GATES.length, pct: 0 }
  const done = CLEARANCE_GATES.filter((g) => clearance[g.key]?.done).length
  return { done, total: CLEARANCE_GATES.length, pct: Math.round((done / CLEARANCE_GATES.length) * 100) }
}

export function allGatesCleared(clearance) {
  if (!clearance) return false
  return CLEARANCE_GATES.every((g) => clearance[g.key]?.done)
}

// Derive a human status label from the clearance state.
export function deriveDischargeStatus(episode) {
  if (!episode || episode.type !== 'IPD') return null
  if (episode.status === 'discharged') return DISCHARGE_STATUS.discharged
  const c = episode.clearance
  if (!c || !c.clinical?.done) return DISCHARGE_STATUS.active
  if (!c.nursing?.done) return DISCHARGE_STATUS.nursingPending
  if (!c.pharmacy?.done) return DISCHARGE_STATUS.pharmacyPending
  if (!c.lab?.done) return DISCHARGE_STATUS.labPending
  if (!c.billing?.done) return DISCHARGE_STATUS.billingPending
  if (!c.documents?.done) return DISCHARGE_STATUS.documentsReady
  return DISCHARGE_STATUS.financiallyCleared
}

export const canOverrideDischarge = (role) => role === 'admin' || role === 'management'
