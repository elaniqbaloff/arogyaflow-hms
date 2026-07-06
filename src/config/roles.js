// ─────────────────────────────────────────────────────────────
// Role-Based Access Control (RBAC)
//
// Single source of truth for: which MODULES appear in the sidebar
// & routing, and which fine-grained CAPABILITIES unlock action
// buttons. Edit here and the whole UI + route guards follow.
// ─────────────────────────────────────────────────────────────

export const MODULES = {
  dashboard: 'dashboard',
  patients: 'patients',
  appointments: 'appointments',
  consultations: 'consultations',
  ipd: 'ipd',
  nursing: 'nursing',
  therapy: 'therapy',
  pharmacy: 'pharmacy',
  lab: 'lab',
  billing: 'billing',
  tasks: 'tasks',
  approvals: 'approvals',
  audit: 'audit',
  reports: 'reports',
  settings: 'settings',
}

// '*' capability => everything (admin).
export const ROLES = {
  admin: {
    label: 'System Administrator',
    blurb: 'Full access across every module and configuration area.',
    accent: '#21664c',
    modules: Object.values(MODULES),
    capabilities: ['*'],
    landing: '/dashboard',
  },
  management: {
    label: 'Management',
    blurb: 'Hospital-wide metrics, reports and oversight.',
    accent: '#7d5a20',
    modules: ['dashboard', 'patients', 'appointments', 'ipd', 'billing', 'reports', 'tasks', 'approvals', 'audit'],
    capabilities: [
      'patients.read', 'appointments.read', 'ipd.read', 'therapy.read',
      'billing.read', 'reports.read', 'reports.export',
      'tasks.read',
      'approvals.read',
      'approvals.decide',
      'audit.read',
    ],
    landing: '/dashboard',
  },
  doctor: {
    label: 'Doctor / Consultant',
    blurb: 'Patient records, consultations, therapy plans and IPD clinical care.',
    accent: '#1b5140',
    modules: ['dashboard', 'patients', 'appointments', 'consultations', 'ipd', 'therapy', 'lab', 'tasks', 'approvals'],
    capabilities: [
      'patients.read', 'patients.update', 'patients.convert',
      'appointments.read', 'appointments.update',
      'consultations.create', 'consultations.read', 'consultations.update',
      'prescriptions.create',
      'ipd.read', 'ipd.update', 'ipd.notes',
      'therapy.read', 'therapy.create', 'therapy.update',
      'nursing.read',
      'lab.create', 'lab.read',
      'billing.read',
      'tasks.read',
      'tasks.update',
      'approvals.read',
      'approvals.request',
    ],
    landing: '/consultations',
  },
  nurse: {
    label: 'Nurse',
    blurb: 'Assigned inpatients, vitals, nursing notes and medication status.',
    accent: '#2f8060',
    modules: ['dashboard', 'patients', 'ipd', 'nursing', 'therapy', 'tasks'],
    capabilities: [
      'patients.read',
      'ipd.read',
      'nursing.read', 'nursing.create', 'nursing.update',
      'vitals.create', 'vitals.read',
      'therapy.read', 'therapy.update',
      'consultations.read', // can see doctor instructions
      'tasks.read',
      'tasks.update',
    ],
    landing: '/nursing',
  },
  reception: {
    label: 'Reception',
    blurb: 'Patient registration, appointments, admissions and front-desk billing.',
    accent: '#2f8060',
    modules: ['dashboard', 'patients', 'appointments', 'ipd', 'billing', 'tasks'],
    capabilities: [
      'patients.create', 'patients.read', 'patients.update', 'patients.delete', 'patients.convert',
      'appointments.create', 'appointments.read', 'appointments.update', 'appointments.delete',
      'ipd.read', 'ipd.admit', 'ipd.transfer', 'ipd.discharge',
      'billing.read', 'billing.create',
      'tasks.read',
      'tasks.update',
      'approvals.request',
    ],
    landing: '/patients',
  },
  pharmacy: {
    label: 'Pharmacy',
    blurb: 'Medicine inventory and prescription fulfilment.',
    accent: '#a07423',
    modules: ['dashboard', 'pharmacy', 'tasks'],
    capabilities: [
      'pharmacy.read', 'pharmacy.create', 'pharmacy.update', 'pharmacy.delete',
      'prescriptions.read', 'prescriptions.dispense',
      'tasks.read',
      'tasks.update',
    ],
    landing: '/pharmacy',
  },
  lab: {
    label: 'Lab / Diagnostics',
    blurb: 'Test requests, sample status, workload and result entry.',
    accent: '#185a52',
    modules: ['dashboard', 'lab', 'tasks'],
    capabilities: ['lab.read', 'lab.create', 'lab.update', 'lab.delete',
      'tasks.read',
      'tasks.update',
    ],
    landing: '/lab',
  },
  finance: {
    label: 'Finance / Billing',
    blurb: 'Invoices, payments, discounts, GST, dues and revenue.',
    accent: '#7d5a20',
    modules: ['dashboard', 'patients', 'billing', 'reports', 'tasks', 'approvals', 'audit'],
    capabilities: [
      'patients.read',
      'billing.read', 'billing.create', 'billing.update', 'billing.delete',
      'reports.read', 'reports.export',
      'tasks.read',
      'tasks.update',
      'approvals.read',
      'approvals.decide',
      'approvals.request',
      'audit.read',
      'pricing.update',
    ],
    landing: '/billing',
  },
  it: {
    label: 'IT / System Admin',
    blurb: 'Users, roles, permissions and system settings.',
    accent: '#184334',
    modules: ['dashboard', 'settings', 'tasks', 'audit'],
    capabilities: [
      'settings.read',
      'users.create', 'users.read', 'users.update', 'users.delete',
      'tasks.read',
      'audit.read',
      'demo.manage',
    ],
    landing: '/settings',
  },
}

export const can = (user, capability) => {
  if (!user) return false
  const role = ROLES[user.role]
  if (!role) return false
  if (role.capabilities.includes('*')) return true
  return role.capabilities.includes(capability)
}

export const canSeeModule = (user, moduleKey) => {
  if (!user) return false
  const role = ROLES[user.role]
  return !!role && role.modules.includes(moduleKey)
}

export const roleLabel = (role) => ROLES[role]?.label || role
