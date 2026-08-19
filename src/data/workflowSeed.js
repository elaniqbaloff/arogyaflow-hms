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
