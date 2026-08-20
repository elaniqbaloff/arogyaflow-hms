// ─────────────────────────────────────────────────────────────
// Patient Journey Tracker (§11 Phase 8a) — derives a merged, chronological
// event timeline for one patient across every department/collection in the
// app. No new collection: this is Phase 8's "model — derive first, store
// later" (§11.1). Extracted from the ad-hoc builder Patients.jsx already
// had (registration/episodes/appointments/consultations/prescriptions/
// labs/therapies/vitals/bills) and extended to cover the domains that
// builder was missing: dental procedure-plan items, physio referrals/
// treatment plans/session notes, and discharge/follow-up tasks — matching
// §11.3's coverage map.
//
// Event shape: { at, department, type, label, status, refId, detail }.
// `department` is always a department CODE (never a display name), so a
// consumer can look up config color/icon via departmentUtils.getDepartment.
// episodes/appointments/consultations/labTests/therapies/bills store
// department as a plain display-name string in this codebase (matching the
// same convention Phase 7c had to resolve for a doctor's own department) —
// this module resolves those through state.departments. procedurePlans/
// treatmentPlans/tasks already carry a department CODE directly
// (established in Phases 1a/5b/6b), so those pass through unresolved.
// ─────────────────────────────────────────────────────────────

import { inr } from '../lib/utils'
import { computeBill } from '../lib/billing'

const hasVal = (v) => v !== undefined && v !== null && v !== ''

function codeForDeptName(state, name) {
  return (state.departments || []).find((d) => d.name === name)?.code || null
}

const billTotal = (b) => b.total ?? computeBill({
  items: b.items, discountType: b.discountType, discountValue: b.discountValue, gstRate: b.gstRate,
}).grandTotal

// Task types that represent a journey-worthy event on their own but aren't
// already covered by a dedicated domain loop below — physio-referral and
// physio-session ARE covered separately (with richer detail than the raw
// task gives), so they're excluded here to avoid a duplicate event for the
// same underlying fact.
const FOLLOWUP_TASK_TYPES = [
  'lab-request', 'critical-lab', 'dental-followup', 'package-renewal',
  'nursing-clearance', 'billing-clearance', 'discharge-clearance',
]

// `patient` must be the resolved/defaulted patient record (e.g.
// Patients.jsx's `withDefaults(raw)`), not the raw stored one — mirrors
// what the original inline builder assumed.
export function buildJourney(state, patient) {
  if (!patient) return []
  const pid = patient.id
  const mrn = patient.mrn
  const events = []
  const push = (department, type, label, status, at, refId, detail) => {
    if (!at) return
    events.push({ at, department: department || null, type, label, status: status ?? null, refId: refId || null, detail: detail || null })
  }

  const patientDept = codeForDeptName(state, patient.department)

  // ── Registration ──
  push(patientDept, 'registration', 'Registration created', null, patient.registeredOn, patient.id, patient.mrn)
  if (patient.pain?.present === 'Yes') {
    push(patientDept, 'pain-recorded', 'Pain score recorded', null, patient.registeredOn, patient.id,
      `Score ${patient.pain.score || '—'}/10 · ${patient.pain.location || 'unspecified'}`)
  }
  const h = patient.history || {}
  if (hasVal(h.existingConditions) || hasVal(h.currentMeds) || hasVal(h.familyHistory)) {
    push(patientDept, 'initial-assessment', 'Initial assessment recorded', null, patient.registeredOn, patient.id, 'Medical history captured at registration')
  }

  // ── Episodes — OPD visits, IPD admission/transfer/discharge ──
  ;(state.episodes || []).filter((e) => e.patientId === pid).forEach((e) => {
    const dept = codeForDeptName(state, e.department) || patientDept
    if (e.type === 'OPD') {
      push(dept, 'opd-visit', `OPD visit · ${e.refNo}`, e.status, e.date, e.id, e.reason)
    } else {
      push(dept, 'ipd-admission', `${e.convertedFrom ? 'Converted to IPD' : 'IPD admission'} · ${e.refNo}`, e.status, e.admitDate, e.id, `${e.ward} — ${e.diagnosis || e.reason}`)
      ;(e.transfers || []).forEach((t) => push(dept, 'bed-transfer', 'Bed transfer', null, t.date, e.id, `${t.from} → ${t.to} (${t.reason})`))
      if (e.dischargeDate) push(dept, 'ipd-discharge', `Discharged · ${e.refNo}`, null, e.dischargeDate, e.id, e.ward)
    }
  })

  // ── Appointments / Consultations / Prescriptions ──
  ;(state.appointments || []).filter((a) => a.patientId === pid).forEach((a) =>
    push(codeForDeptName(state, a.department) || patientDept, 'appointment', `Appointment — ${a.status}`, a.status, a.date, a.id, a.reason))
  ;(state.consultations || []).filter((c) => c.patientId === pid).forEach((c) =>
    push(codeForDeptName(state, c.department) || patientDept, 'consultation', 'Consultation completed', c.status, c.date, c.id, c.diagnosis || c.notes))
  ;(state.prescriptions || []).filter((r) => r.patientId === pid).forEach((r) =>
    push(patientDept, 'prescription', `Prescription added — ${r.status}`, r.status, r.createdOn, r.id, (r.items || []).map((i) => i.name).join(', ')))

  // ── Diagnostics — sample-state pipeline (§7a: ordered→collected→resulted→acknowledged) ──
  ;(state.labTests || []).filter((l) => l.patientId === pid).forEach((l) =>
    push('DIAG', 'lab-test', `Lab — ${l.testName} (${l.status})${l.critical ? ' · CRITICAL' : ''}`, l.status, l.requestedOn, l.id, l.result || 'Requested'))

  // ── Panchakarma therapies, vitals, billing ──
  ;(state.therapies || []).filter((t) => t.patientId === pid).forEach((t) =>
    push(codeForDeptName(state, 'Panchakarma') || patientDept, 'therapy', `Therapy — ${t.type} (${t.status})`, t.status, t.date, t.id, t.notes))
  ;(state.vitals || []).filter((v) => v.patientId === pid).forEach((v) =>
    push(patientDept, 'vitals', 'Vitals recorded', null, v.recordedAt, v.id, `BP ${v.bp} · Pulse ${v.pulse} · SpO₂ ${v.spo2}%`))
  ;(state.bills || []).filter((b) => b.patientId === pid).forEach((b) =>
    push(codeForDeptName(state, b.department) || patientDept, 'bill', `Bill generated — ${b.invoiceNo} (${b.status})`, b.status, b.date, b.id, `${b.billType} · ${inr(b.total)}`))

  // ── Dental (§9) — procedure-plan items, one event per item at its latest transition ──
  ;(state.procedurePlans || []).filter((p) => p.patientId === pid).forEach((p) => {
    (p.items || []).forEach((item) => {
      const at = item.completedAt || item.startedAt || item.acceptedAt || p.createdAt
      push('DENT', 'dental-procedure', `Dental — ${item.procedureName}${item.tooth ? ` (tooth ${item.tooth})` : ''}`, item.status, at, p.id, item.phase)
    })
  })

  // ── Physiotherapy (§10) — referrals, treatment plans, session notes ──
  ;(state.tasks || []).filter((t) => t.mrn === mrn && t.type === 'physio-referral').forEach((t) =>
    push('PHYS', 'physio-referral', 'Physiotherapy referral', t.status, t.createdAt, t.id, t.notes))
  ;(state.treatmentPlans || []).filter((p) => p.patientId === pid).forEach((p) => {
    push('PHYS', 'physio-plan-started', `Treatment plan started · ${p.diagnosis}`, 'active', p.createdAt, p.id, p.goals)
    if (p.status === 'completed') {
      push('PHYS', 'physio-plan-completed', `Treatment plan completed · ${p.diagnosis}`, p.status, p.updatedAt, p.id,
        p.goalAchievement ? `Goals ${p.goalAchievement.replace('-', ' ')}${p.outcomeSummary ? ` — ${p.outcomeSummary}` : ''}` : p.outcomeSummary)
    }
  })
  ;(state.progressNotes || []).filter((n) => n.patientId === pid).forEach((n) =>
    push('PHYS', 'physio-session-note', 'Physio session note', null, n.createdAt, n.id, `Pain ${n.painScore}/10${n.notesDone ? ` — ${n.notesDone}` : ''}`))

  // ── Discharge / follow-up tasks (§9.8, §10.1, §11 coverage) ──
  ;(state.tasks || []).filter((t) => t.mrn === mrn && FOLLOWUP_TASK_TYPES.includes(t.type)).forEach((t) =>
    push(t.assignedDepartment || patientDept, t.type, t.label, t.status, t.completedAt || t.createdAt, t.id, t.notes))

  return events.filter((e) => e.at).sort((a, b) => b.at.localeCompare(a.at))
}

// Active journey strip (§11.2 Phase 8c) — the patient's currently OPEN
// items across departments, not history: "IPD (Ward) · Panchakarma 3/7 ·
// Lab: 1 pending · Pharmacy: to dispense · Bill: ₹4,300 due". A segment is
// only included when it's actually relevant (non-zero/active) so the strip
// stays short for a patient with nothing outstanding. Every number here is
// already computed elsewhere in the app hospital-wide (Dashboard, Reports)
// — this just re-runs the same filters scoped to one patient.
export function buildActiveStrip(state, patient) {
  if (!patient) return []
  const pid = patient.id
  const segments = []

  const episodes = (state.episodes || []).filter((e) => e.patientId === pid)
  const activeIpd = episodes.find((e) => e.type === 'IPD' && e.status === 'admitted')
  const latestOpd = [...episodes.filter((e) => e.type === 'OPD')].sort((a, b) => b.date.localeCompare(a.date))[0]
  const activeEpisode = activeIpd || latestOpd

  if (activeIpd) segments.push({ key: 'ipd', label: `IPD (${activeIpd.ward})`, tone: 'sky' })

  // Panchakarma progress is an approximation: there's no explicit therapy-
  // course/package concept in this data model (unlike physio's
  // treatmentPlans.plannedSessions) — "completed of all therapies tied to
  // the current episode" is the closest honest reading, same convention as
  // 6e's no-show rate and 7d's order→collect TAT.
  if (activeEpisode) {
    const eTherapies = (state.therapies || []).filter((t) => t.episodeId === activeEpisode.id)
    if (eTherapies.length > 0) {
      const done = eTherapies.filter((t) => t.status === 'completed').length
      segments.push({ key: 'therapy', label: `Panchakarma ${done}/${eTherapies.length}`, tone: 'green' })
    }
  }

  const pendingLab = (state.labTests || []).filter((l) => l.patientId === pid && !['acknowledged', 'cancelled'].includes(l.status)).length
  if (pendingLab > 0) segments.push({ key: 'lab', label: `Lab: ${pendingLab} pending`, tone: 'sky' })

  const toDispense = (state.prescriptions || []).filter((r) => r.patientId === pid && r.status !== 'dispensed').length
  if (toDispense > 0) segments.push({ key: 'pharmacy', label: 'Pharmacy: to dispense', tone: 'gold' })

  const dueBills = (state.bills || []).filter((b) => b.patientId === pid && b.status !== 'paid')
  const dueAmount = dueBills.reduce((s, b) => s + (billTotal(b) - (b.paidAmount || 0)), 0)
  if (dueAmount > 0) segments.push({ key: 'billing', label: `Bill: ${inr(dueAmount)} due`, tone: 'rose' })

  // Beyond the blueprint's literal example — physio/dental open-item
  // coverage, using the same session-note-count proxy the Physio tab's
  // pain trend already relies on (§10.3), not a new metric.
  const activePhysioPlan = (state.treatmentPlans || []).find((p) => p.patientId === pid && p.status === 'active')
  if (activePhysioPlan) {
    const sessionsDone = (state.progressNotes || []).filter((n) => n.treatmentPlanId === activePhysioPlan.id).length
    segments.push({ key: 'physio', label: `Physio: ${sessionsDone}/${activePhysioPlan.plannedSessions} sessions`, tone: 'gold' })
  }

  const openDentalItems = (state.procedurePlans || [])
    .filter((p) => p.patientId === pid)
    .flatMap((p) => p.items || [])
    .filter((i) => !['completed', 'cancelled'].includes(i.status)).length
  if (openDentalItems > 0) segments.push({ key: 'dental', label: `Dental: ${openDentalItems} pending`, tone: 'sky' })

  return segments
}
