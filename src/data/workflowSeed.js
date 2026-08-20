import { daysFromNow } from '../lib/utils'

// ─────────────────────────────────────────────────────────────
// Workflow seed data (ArogyaFlow phase): pricing master, pending
// billable items, cross-department tasks, approvals, audit trail.
// IDs are stable so demo scenarios reference them predictably.
// ─────────────────────────────────────────────────────────────

// Pricing master — official rates editable only by admin/management/finance.
export const pricing = [
  { id: 'prc_opd_ayur', code: 'OPD-AYUR', name: 'Ayurveda consultation', department: 'Ayurveda', amount: 400, taxable: true },
  { id: 'prc_opd_allo', code: 'OPD-ALLO', name: 'General medicine consultation', department: 'Allopathy', amount: 400, taxable: true },
  { id: 'prc_opd_dental', code: 'OPD-DENT', name: 'Dental consultation', department: 'Dental', amount: 500, taxable: true },
  { id: 'prc_bed_gen', code: 'IPD-GEN', name: 'General ward bed / day', department: 'IPD', amount: 1200, taxable: true },
  { id: 'prc_bed_dlx', code: 'IPD-DLX', name: 'Deluxe room / day', department: 'IPD', amount: 3500, taxable: true },
  { id: 'prc_pk_abhyanga', code: 'PK-ABH', name: 'Abhyanga therapy', department: 'Panchakarma', amount: 1500, taxable: true },
  { id: 'prc_pk_shiro', code: 'PK-SHI', name: 'Shirodhara therapy', department: 'Panchakarma', amount: 1700, taxable: true },
  { id: 'prc_pk_kizhi', code: 'PK-KIZ', name: 'Kizhi therapy', department: 'Panchakarma', amount: 1800, taxable: true },
  { id: 'prc_lab_hba1c', code: 'LAB-HBA1C', name: 'HbA1c test', department: 'Diagnostics', amount: 450, taxable: true },
  { id: 'prc_lab_lipid', code: 'LAB-LIPID', name: 'Lipid profile', department: 'Diagnostics', amount: 650, taxable: true },
  { id: 'prc_nursing', code: 'IPD-NURS', name: 'Nursing care / day', department: 'IPD', amount: 300, taxable: true },
  // ALIDS dental procedure catalog (§9.7) — prc_opd_dental above covers the
  // checkup; these cover the rest of the public service list.
  { id: 'prc_dent_cleaning', code: 'DENT-CLEAN', name: 'Scaling & polishing (cleaning)', department: 'Dental', amount: 800, taxable: true },
  { id: 'prc_dent_filling', code: 'DENT-FILL', name: 'Composite filling', department: 'Dental', amount: 1200, taxable: true },
  { id: 'prc_dent_rct', code: 'DENT-RCT', name: 'Root canal treatment', department: 'Dental', amount: 6000, taxable: true },
  { id: 'prc_dent_extraction', code: 'DENT-EXT', name: 'Tooth extraction (simple)', department: 'Dental', amount: 1000, taxable: true },
  { id: 'prc_dent_crown', code: 'DENT-CROWN', name: 'Crown (PFM)', department: 'Dental', amount: 5000, taxable: true },
  { id: 'prc_dent_bridge', code: 'DENT-BRIDGE', name: 'Bridge (per unit)', department: 'Dental', amount: 5500, taxable: true },
  { id: 'prc_dent_implant', code: 'DENT-IMPLANT', name: 'Dental implant', department: 'Dental', amount: 25000, taxable: true },
  { id: 'prc_dent_whitening', code: 'DENT-WHITEN', name: 'Teeth whitening', department: 'Dental', amount: 3500, taxable: true },
  // Physiotherapy (§10.8) — a standalone per-session rate for the
  // pay-per-session fallback, plus two package presets. Package `amount`
  // is a discounted lump sum vs. paying per-session individually.
  { id: 'prc_phys_session', code: 'PHYS-SESSION', name: 'Physiotherapy session', department: 'Physiotherapy', amount: 800, taxable: true },
  { id: 'prc_phys_pkg5', code: 'PHYS-PKG5', name: '5-Session Rehab Package', department: 'Physiotherapy', amount: 3750, taxable: true },
  { id: 'prc_phys_pkg10', code: 'PHYS-PKG10', name: '10-Session Rehab Package', department: 'Physiotherapy', amount: 7000, taxable: true },
]

// Pending billable items — services rendered, not yet on a final invoice.
export const billableItems = [
  { id: 'bi_1', mrn: 'MRN-0007', patientId: 'pat_7', episodeId: 'ep_7b', department: 'Panchakarma', desc: 'Kati Basti', priceId: 'prc_pk_kizhi', amount: 2000, status: 'pending', createdAt: daysFromNow(0), source: 'therapy' },
  { id: 'bi_2', mrn: 'MRN-0004', patientId: 'pat_4', episodeId: 'ep_4b', department: 'IPD', desc: 'Nursing care (1 day)', priceId: 'prc_nursing', amount: 300, status: 'pending', createdAt: daysFromNow(0), source: 'nursing' },
]

// Dental procedure plans (§9.3) — a phased treatment plan per patient.
// Joseph Varghese (pat_6 / MRN-0006) is mid-treatment: RCT accepted and
// ready to start, crown proposed for once the canal work is done.
export const procedurePlans = [
  {
    id: 'ppl_1', patientId: 'pat_6', mrn: 'MRN-0006', department: 'DENT',
    items: [
      {
        id: 'ppli_1', tooth: '26', priceId: 'prc_dent_rct', procedureName: 'Root canal treatment',
        phase: 'Access & instrumentation', status: 'accepted', estAmount: 6000, consultationId: null,
        acceptedAt: daysFromNow(-1), startedAt: null, completedAt: null, billableItemId: null,
      },
      {
        id: 'ppli_2', tooth: '26', priceId: 'prc_dent_crown', procedureName: 'Crown (PFM)',
        phase: 'Restoration', status: 'proposed', estAmount: 5000, consultationId: null,
        acceptedAt: null, startedAt: null, completedAt: null, billableItemId: null,
      },
    ],
    consentStatus: 'pending', createdBy: 'Dr. Naseem Ali', createdAt: daysFromNow(-1), updatedAt: daysFromNow(-1),
  },
]

// Imaging/document reference metadata (§9.5) — localStorage can't hold the
// actual file, so this is a pointer into a real imaging system, not a blob.
export const attachments = [
  {
    id: 'att_1', patientId: 'pat_6', mrn: 'MRN-0006', type: 'xray',
    label: 'Pre-op periapical X-ray — tooth 26', externalRef: 'PACS-KTM-2026-0842',
    takenAt: daysFromNow(-3), uploadedBy: 'Dr. Naseem Ali', createdAt: daysFromNow(-3),
  },
]

// Physiotherapy treatment plans (§10.6). Krishnan Nair (pat_4 / MRN-0004)
// already has a seeded post-stroke consultation (con_1, gait training) —
// this plan is that same care continued under the physio module.
export const treatmentPlans = [
  {
    id: 'tp_1', patientId: 'pat_4', mrn: 'MRN-0004', department: 'PHYS',
    referralId: null, diagnosis: 'Hemiparesis, recovering — post-stroke',
    goals: 'Independent ambulation without an assistive device',
    plannedSessions: 12, frequency: '3x/week for 4 weeks', packageId: null,
    status: 'active', outcomeSummary: '',
    createdBy: 'Dr. Kavya Nair', createdAt: daysFromNow(-2), updatedAt: daysFromNow(-2),
  },
]

// Physiotherapy progress notes (§10.7) — per-session SOAP-lite notes.
// These predate Phase 6b's session-appointment/task linkage (no
// appointmentId/taskId), representing the sessions already implied by
// tp_1's history before formal scheduling existed — showing a real
// pain-reduction trend (7 → 6 → 5) is the point of seeding these at all.
export const progressNotes = [
  {
    id: 'pn_1', patientId: 'pat_4', mrn: 'MRN-0004', treatmentPlanId: 'tp_1',
    appointmentId: null, taskId: null, painScore: 7,
    keyRomLabel: 'Hip flexion', keyRomDegrees: 60,
    notesDone: 'Gait training with parallel bars, passive ROM exercises.',
    notesResponse: 'Tolerated well, mild fatigue after 20 minutes.',
    nextSessionFocus: 'Progress to single-point cane, add resistance band work.',
    writtenBy: 'Dr. Kavya Nair', createdAt: daysFromNow(-6),
  },
  {
    id: 'pn_2', patientId: 'pat_4', mrn: 'MRN-0004', treatmentPlanId: 'tp_1',
    appointmentId: null, taskId: null, painScore: 6,
    keyRomLabel: 'Hip flexion', keyRomDegrees: 75,
    notesDone: 'Ambulation with single-point cane, resistance band strengthening.',
    notesResponse: 'Improved confidence, reduced fear of falling.',
    nextSessionFocus: 'Begin unsupported standing balance drills.',
    writtenBy: 'Dr. Kavya Nair', createdAt: daysFromNow(-4),
  },
  {
    id: 'pn_3', patientId: 'pat_4', mrn: 'MRN-0004', treatmentPlanId: 'tp_1',
    appointmentId: null, taskId: null, painScore: 5,
    keyRomLabel: 'Hip flexion', keyRomDegrees: 85,
    notesDone: 'Unsupported standing balance, 20m walk without aid attempted.',
    notesResponse: 'Managed 15m unaided before needing support.',
    nextSessionFocus: 'Continue unaided walking distance progression.',
    writtenBy: 'Dr. Kavya Nair', createdAt: daysFromNow(-2),
  },
]

// Package/session billing engine (§10.8) — shared shape meant for
// Panchakarma courses and Yoga memberships too, not physio-specific;
// only the physio UI (TreatmentPlanPanel) creates/consumes these so far.
export const packages = []

export const tasks = [
  { id: 'tsk_1', type: 'lab-request', label: 'Lab test requested', priority: 'Normal', mrn: 'MRN-0007', sourceRole: 'doctor', assignedRole: 'lab', assignedDepartment: 'DIAG', assignedUserId: null, status: 'Pending', createdBy: 'Dr. Anand Varma', createdAt: daysFromNow(-1), dueAt: null, relatedId: 'lab_3', notes: 'Vitamin D for IPD Panchakarma patient.', acceptedBy: null, acceptedAt: null, startedAt: null, completedAt: null, blockedReason: null },
  { id: 'tsk_2', type: 'pharmacy-dispense', label: 'Prescription to dispense', priority: 'Normal', mrn: 'MRN-0007', sourceRole: 'doctor', assignedRole: 'pharmacy', assignedDepartment: 'PHAR', assignedUserId: null, status: 'Pending', createdBy: 'Dr. Anand Varma', createdAt: daysFromNow(-1), dueAt: null, relatedId: 'rx_3', notes: 'Ksheerabala 101 + Ashwagandha.', acceptedBy: null, acceptedAt: null, startedAt: null, completedAt: null, blockedReason: null },
  { id: 'tsk_3', type: 'low-stock', label: 'Low stock alert', priority: 'High', mrn: null, sourceRole: 'system', assignedRole: 'pharmacy', assignedDepartment: 'PHAR', assignedUserId: null, status: 'Pending', createdBy: 'System', createdAt: daysFromNow(0), dueAt: null, relatedId: 'med_4', notes: 'Paracetamol 650mg below reorder level.', acceptedBy: null, acceptedAt: null, startedAt: null, completedAt: null, blockedReason: null },
  { id: 'tsk_4', type: 'discount-approval', label: 'Discount approval requested', priority: 'High', mrn: 'MRN-0004', sourceRole: 'doctor', assignedRole: 'finance', assignedDepartment: 'FIN', assignedUserId: null, status: 'Pending', createdBy: 'Dr. Reema Joseph', createdAt: daysFromNow(0), dueAt: null, relatedId: 'apr_1', notes: '10% discount requested for IPD rehab patient.', acceptedBy: null, acceptedAt: null, startedAt: null, completedAt: null, blockedReason: null },
]

export const approvals = [
  { id: 'apr_1', type: 'discount', typeLabel: 'Discount approval', mrn: 'MRN-0004', amount: 1500, requestedBy: 'Dr. Reema Joseph', requestedRole: 'doctor', requestedAt: daysFromNow(0), reason: 'Long-term rehab patient, family financial hardship.', status: 'Pending', decidedBy: null, decidedRole: null, decidedAt: null, remarks: '', relatedId: 'bill_2' },
  { id: 'apr_2', type: 'highValue', typeLabel: 'High-value invoice review', mrn: 'MRN-0007', amount: 21840, requestedBy: 'George Mathew', requestedRole: 'finance', requestedAt: daysFromNow(-1), reason: 'Residential Panchakarma package exceeds ₹20,000.', status: 'Approved', decidedBy: 'Latha Menon', decidedRole: 'management', decidedAt: daysFromNow(0), remarks: 'Approved — standard package.', relatedId: 'bill_4' },
]

export const audit = [
  { id: 'aud_1', at: daysFromNow(-1), user: 'Dr. Anand Varma', role: 'doctor', action: 'lab.request.created', module: 'lab', recordId: 'lab_3', mrn: 'MRN-0007', oldValue: null, newValue: 'Vitamin D', remarks: '', severity: 'info' },
  { id: 'aud_2', at: daysFromNow(0), user: 'Latha Menon', role: 'management', action: 'approval.approved', module: 'approvals', recordId: 'apr_2', mrn: 'MRN-0007', oldValue: 'Pending', newValue: 'Approved', remarks: 'Standard package', severity: 'notice' },
  { id: 'aud_3', at: daysFromNow(0), user: 'System', role: 'system', action: 'stock.low', module: 'pharmacy', recordId: 'med_4', mrn: null, oldValue: null, newValue: '8 units', remarks: 'Below reorder level', severity: 'warning' },
]

export const snapshots = []
