import {
  LayoutDashboard, Users, CalendarDays, Stethoscope, BedDouble,
  HeartPulse, Flower2, Pill, FlaskConical, Receipt, BarChart3, Settings,
  Bell, CheckSquare, ScrollText, Radar,
} from 'lucide-react'

// Sidebar group order (top to bottom). Kept separate from NAV's own order so
// the array below doesn't need reshuffling just to cluster by group.
export const NAV_GROUPS = ['Care', 'Departments', 'Operations', 'Admin']

// Order = sidebar order within a group. Each entry is filtered per-role via
// canSeeModule(); `group` buckets it under one of NAV_GROUPS in the sidebar.
export const NAV = [
  { key: 'commandCenter', label: 'Command Center', to: '/command-center', icon: Radar, group: 'Care' },
  { key: 'dashboard', label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, group: 'Care' },
  { key: 'patients', label: 'Patients', to: '/patients', icon: Users, group: 'Care' },
  { key: 'appointments', label: 'Appointments', to: '/appointments', icon: CalendarDays, group: 'Care' },
  { key: 'consultations', label: 'Consultations', to: '/consultations', icon: Stethoscope, group: 'Care' },
  { key: 'ipd', label: 'IPD & Beds', to: '/ipd', icon: BedDouble, group: 'Departments' },
  { key: 'nursing', label: 'Nursing & Vitals', to: '/nursing', icon: HeartPulse, group: 'Departments' },
  { key: 'therapy', label: 'Panchakarma', to: '/therapy', icon: Flower2, group: 'Departments' },
  { key: 'pharmacy', label: 'Pharmacy', to: '/pharmacy', icon: Pill, group: 'Departments' },
  { key: 'lab', label: 'Lab & Diagnostics', to: '/lab', icon: FlaskConical, group: 'Departments' },
  { key: 'billing', label: 'Billing & Finance', to: '/billing', icon: Receipt, group: 'Operations' },
  { key: 'tasks', label: 'Tasks & Alerts', to: '/tasks', icon: Bell, group: 'Operations' },
  { key: 'approvals', label: 'Approval Center', to: '/approvals', icon: CheckSquare, group: 'Operations' },
  { key: 'reports', label: 'Reports', to: '/reports', icon: BarChart3, group: 'Operations' },
  { key: 'audit', label: 'Audit Log', to: '/audit', icon: ScrollText, group: 'Admin' },
  { key: 'settings', label: 'Settings', to: '/settings', icon: Settings, group: 'Admin' },
]
