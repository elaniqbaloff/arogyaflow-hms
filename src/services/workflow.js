// ─────────────────────────────────────────────────────────────
// Workflow domain: audit events, tasks/notifications, approvals.
// Pure builders — they return records; the store dispatches them.
// ─────────────────────────────────────────────────────────────

import { uid } from '../lib/utils'

// ── Audit ──
export const AUDIT_SEVERITY = { info: 'info', notice: 'notice', warning: 'warning', critical: 'critical' }

export function buildAudit({ user, action, module, recordId, mrn, oldValue, newValue, remarks, severity = 'info' }) {
  return {
    id: uid('aud'),
    at: new Date().toISOString(),
    user: user?.name || 'System',
    role: user?.role || 'system',
    action,
    module,
    recordId: recordId || null,
    mrn: mrn || null,
    oldValue: oldValue ?? null,
    newValue: newValue ?? null,
    remarks: remarks || '',
    severity,
  }
}

// ── Tasks / notifications ──
export const TASK_STATUS = ['Pending', 'Accepted', 'In Progress', 'Blocked', 'Completed', 'Cancelled']
export const TASK_PRIORITY = ['Low', 'Normal', 'High', 'Critical']

// Role -> operational department code, used to derive assignedDepartment
// for routes/legacy tasks that only carry an assignedRole.
export const ROLE_DEPARTMENT = {
  lab: 'DIAG',
  pharmacy: 'PHAR',
  finance: 'FIN',
  reception: 'FRONT',
  doctor: 'AYUR',
  nurse: 'IPD',
  admin: 'ADMIN',
  management: 'ADMIN',
  it: 'ADMIN',
  dentist: 'DENT',
  physiotherapist: 'PHYS',
}

// Common task types and which role/department they route to.
export const TASK_ROUTES = {
  'lab-request': { assignedRole: 'lab', assignedDepartment: 'DIAG', label: 'Lab test requested' },
  'pharmacy-dispense': { assignedRole: 'pharmacy', assignedDepartment: 'PHAR', label: 'Prescription to dispense' },
  'billing-clearance': { assignedRole: 'finance', assignedDepartment: 'FIN', label: 'Billing clearance for discharge' },
  'discharge-clearance': { assignedRole: 'reception', assignedDepartment: 'FRONT', label: 'Discharge clearance ready' },
  'low-stock': { assignedRole: 'pharmacy', assignedDepartment: 'PHAR', label: 'Low stock alert' },
  'near-expiry': { assignedRole: 'pharmacy', assignedDepartment: 'PHAR', label: 'Near-expiry medicine' },
  'discount-approval': { assignedRole: 'finance', assignedDepartment: 'FIN', label: 'Discount approval requested' },
  'bilingual-doc': { assignedRole: 'reception', assignedDepartment: 'FRONT', label: 'Arabic/bilingual document required' },
  'critical-lab': { assignedRole: 'doctor', assignedDepartment: 'AYUR', label: 'Critical lab result' },
  'bed-cleaning': { assignedRole: 'reception', assignedDepartment: 'FRONT', label: 'Bed marked for cleaning' },
  'nursing-clearance': { assignedRole: 'nurse', assignedDepartment: 'IPD', label: 'Nursing discharge clearance' },
}

export function buildTask({
  type, priority = 'Normal', mrn, sourceRole, assignedRole, assignedDepartment, assignedUserId,
  createdBy, relatedId, notes, dueAt,
}) {
  const route = TASK_ROUTES[type] || {}
  return {
    id: uid('tsk'),
    type,
    label: route.label || type,
    priority,
    mrn: mrn || null,
    sourceRole: sourceRole || 'system',
    assignedRole: assignedRole || route.assignedRole || 'admin',
    assignedDepartment: assignedDepartment || route.assignedDepartment || null,
    assignedUserId: assignedUserId || null,
    status: 'Pending',
    createdBy: createdBy || 'System',
    createdAt: new Date().toISOString(),
    dueAt: dueAt || null,
    relatedId: relatedId || null,
    notes: notes || '',
    acceptedBy: null,
    acceptedAt: null,
    startedAt: null,
    completedAt: null,
    blockedReason: null,
  }
}

// ── Approvals ──
export const APPROVAL_TYPES = {
  discount: 'Discount approval',
  waiver: 'Charge waiver',
  invoiceEdit: 'Manual invoice edit',
  priceChange: 'Price change',
  refund: 'Refund',
  dischargeClearance: 'Discharge financial clearance',
  highValue: 'High-value invoice review',
}

// Only these roles may approve/reject.
export const APPROVER_ROLES = ['admin', 'management', 'finance']

export function buildApproval({ type, mrn, amount, requestedBy, requestedRole, reason, relatedId }) {
  return {
    id: uid('apr'),
    type,
    typeLabel: APPROVAL_TYPES[type] || type,
    mrn: mrn || null,
    amount: amount ?? null,
    requestedBy: requestedBy || 'Unknown',
    requestedRole: requestedRole || 'system',
    requestedAt: new Date().toISOString(),
    reason: reason || '',
    status: 'Pending',
    decidedBy: null,
    decidedRole: null,
    decidedAt: null,
    remarks: '',
    relatedId: relatedId || null,
  }
}

export const canApprove = (role) => APPROVER_ROLES.includes(role)
