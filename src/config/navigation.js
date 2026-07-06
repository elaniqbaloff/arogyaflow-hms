import {
  LayoutDashboard, Users, CalendarDays, Stethoscope, BedDouble,
  HeartPulse, Flower2, Pill, FlaskConical, Receipt, BarChart3, Settings,
  Bell, CheckSquare, ScrollText,
} from 'lucide-react'

// Order = sidebar order. Each entry is filtered per-role via canSeeModule().
export const NAV = [
  { key: 'dashboard', label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { key: 'patients', label: 'Patients', to: '/patients', icon: Users },
  { key: 'appointments', label: 'Appointments', to: '/appointments', icon: CalendarDays },
  { key: 'consultations', label: 'Consultations', to: '/consultations', icon: Stethoscope },
  { key: 'ipd', label: 'IPD & Beds', to: '/ipd', icon: BedDouble },
  { key: 'nursing', label: 'Nursing & Vitals', to: '/nursing', icon: HeartPulse },
  { key: 'therapy', label: 'Panchakarma', to: '/therapy', icon: Flower2 },
  { key: 'pharmacy', label: 'Pharmacy', to: '/pharmacy', icon: Pill },
  { key: 'lab', label: 'Lab & Diagnostics', to: '/lab', icon: FlaskConical },
  { key: 'billing', label: 'Billing & Finance', to: '/billing', icon: Receipt },
  { key: 'tasks', label: 'Tasks & Alerts', to: '/tasks', icon: Bell },
  { key: 'approvals', label: 'Approval Center', to: '/approvals', icon: CheckSquare },
  { key: 'audit', label: 'Audit Log', to: '/audit', icon: ScrollText },
  { key: 'reports', label: 'Reports', to: '/reports', icon: BarChart3 },
  { key: 'settings', label: 'Settings', to: '/settings', icon: Settings },
]
