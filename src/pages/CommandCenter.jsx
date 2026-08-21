// ─────────────────────────────────────────────────────────────
// Management Command Center (§12 Phase 9) — the dashboard variant the
// `management` role lands on instead of the generic Dashboard. All v1
// numbers are computable from existing state, per §12's own framing.
// Row 1 (hospital pulse) landed in 9a; Row 2 (flow & delays) in 9b. Row 3
// (department load/bottlenecks), Row 4 (clinical ops/staff workload) and
// the alerts rail follow in 9c-9e (re-split from an original 9b-9d after
// 9a's scoping showed Row 2+3 combined was too big for one step).
//
// Every tile links to its owning module page (never a dead-end number),
// matching the click-through convention already established in Phase 8b —
// the owning page, not a deep link to a specific filtered record.
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Radar, CalendarDays, BedDouble, ArrowRightCircle, IndianRupee,
  Clock, LogOut, FlaskConical, Pill, AlertTriangle, Flower2, Smile, Activity, Users,
} from 'lucide-react'
import { useHospital } from '../store/HospitalContext'
import { PageHeader, StatCard, Badge } from '../components/ui/primitives'
import { departmentOptions, departmentDotClass } from '../config/departmentUtils'
import { inr, today } from '../lib/utils'
import { computeBill } from '../lib/billing'
import { emptyClearance, allGatesCleared } from '../services/discharge'

const billTotal = (b) => b.total ?? computeBill({
  items: b.items, discountType: b.discountType, discountValue: b.discountValue, gstRate: b.gstRate,
}).grandTotal

const hoursBetween = (a, b) => (new Date(b) - new Date(a)) / 36e5
const LAB_STALE_HOURS = 24

// Bottleneck config (§12 Row 3) — a department is flagged when its oldest
// open task has sat longer than DEPT_STALE_HOURS, or its open-task queue
// is longer than DEPT_QUEUE_LIMIT. Plain code constants, not a Settings UI
// — "config" in the blueprint's own parenthetical just means "a tunable
// value," not necessarily an admin-editable one; revisit if management
// asks to tune these themselves.
const DEPT_STALE_HOURS = 24
const DEPT_QUEUE_LIMIT = 5

export default function CommandCenter() {
  const { state } = useHospital()

  const data = useMemo(() => {
    const todayStr = today()
    const monthPrefix = todayStr.slice(0, 7)

    const opdVisitsToday = state.episodes.filter((e) => e.type === 'OPD' && e.date === todayStr).length

    const occupied = state.beds.filter((b) => b.status === 'occupied').length
    const totalBeds = state.beds.length
    const occupancyPct = totalBeds ? Math.round((occupied / totalBeds) * 100) : 0

    const admissionsToday = state.episodes.filter((e) => e.type === 'IPD' && e.admitDate === todayStr).length
    const dischargesToday = state.episodes.filter((e) => e.type === 'IPD' && e.dischargeDate === todayStr).length

    const revenueToday = state.bills.filter((b) => b.date === todayStr).reduce((s, b) => s + (b.paidAmount || 0), 0)
    const revenueMtd = state.bills.filter((b) => b.date?.startsWith(monthPrefix)).reduce((s, b) => s + (b.paidAmount || 0), 0)

    const pendingDues = state.bills
      .filter((b) => b.status !== 'paid')
      .reduce((s, b) => s + (billTotal(b) - (b.paidAmount || 0)), 0)

    // ── Row 2: flow & delays (§12) ──
    const now = new Date().toISOString()

    const pendingApprovals = state.approvals.filter((a) => a.status === 'Pending')
    const oldestApprovalHours = pendingApprovals.length
      ? Math.max(...pendingApprovals.map((a) => hoursBetween(a.requestedAt, now)))
      : null

    // "Discharge-ready but blocked" (§12 Row 2): clinically dischargeable
    // (the clinical gate is cleared) but stuck on a later gate — the
    // hospital-wide rollup of the same per-patient clearance state Phase 8d
    // surfaces on one patient's profile.
    const dischargeBlocked = state.episodes.filter((e) => {
      if (e.type !== 'IPD' || e.status !== 'admitted') return false
      const c = e.clearance || emptyClearance()
      return c.clinical?.done && !allGatesCleared(c)
    }).length

    // Lab TAT (§7a/§7d): pending count + how many have sat open past
    // LAB_STALE_HOURS. requestedOn is date-only, same approximation 7d
    // already documents for order->collect timing.
    const labOpen = state.labTests.filter((l) => !['acknowledged', 'cancelled'].includes(l.status))
    const labStale = labOpen.filter((l) => hoursBetween(`${l.requestedOn}T00:00:00`, now) > LAB_STALE_HOURS).length

    const toDispense = state.prescriptions.filter((r) => r.status !== 'dispensed').length
    const pharmacyAlerts = state.tasks.filter((t) => ['low-stock', 'near-expiry'].includes(t.type) && !['Completed', 'Cancelled'].includes(t.status)).length

    const openCriticalTasks = state.tasks.filter((t) => t.priority === 'Critical' && !['Completed', 'Cancelled'].includes(t.status)).length

    // ── Row 3: department load & bottlenecks (§12) ──
    // Appointments/bills store department as a display-name string in this
    // codebase (same convention journey.js already resolves — Phase 8a's
    // note); tasks already carry assignedDepartment as a CODE directly
    // (Phase 1a), so that filter needs no resolution.
    const departmentLoad = departmentOptions(state).map((dept) => {
      const apptsToday = state.appointments.filter((a) => a.department === dept.name && a.date === todayStr).length
      const openTasks = state.tasks.filter((t) => t.assignedDepartment === dept.code && !['Completed', 'Cancelled'].includes(t.status))
      const oldestTaskHours = openTasks.length ? Math.max(...openTasks.map((t) => hoursBetween(t.createdAt, now))) : null
      const revMtd = state.bills
        .filter((b) => b.department === dept.name && b.date?.startsWith(monthPrefix))
        .reduce((s, b) => s + (b.paidAmount || 0), 0)
      const bottleneck = (oldestTaskHours != null && oldestTaskHours > DEPT_STALE_HOURS) || openTasks.length > DEPT_QUEUE_LIMIT
      return { code: dept.code, name: dept.name, apptsToday, openTaskCount: openTasks.length, oldestTaskHours, revMtd, bottleneck }
    }).sort((a, b) => Number(b.bottleneck) - Number(a.bottleneck) || b.openTaskCount - a.openTaskCount)

    // ── Row 4: clinical operations & staff workload (§12) ──
    const therapiesToday = state.therapies.filter((t) => t.date === todayStr)
    const therapiesScheduledToday = therapiesToday.filter((t) => t.status === 'scheduled').length
    const therapiesCompletedToday = therapiesToday.filter((t) => t.status === 'completed').length

    const weekAgoStr = new Date(Date.now() - 7 * 24 * 36e5).toISOString().slice(0, 10)
    const dentalProceduresWeek = (state.procedurePlans || [])
      .flatMap((p) => p.items || [])
      .filter((i) => i.status === 'completed' && (i.completedAt || '').slice(0, 10) >= weekAgoStr).length

    const physioActivePlans = (state.treatmentPlans || []).filter((p) => p.status === 'active').length
    // Same "reason='Session' + department='Physiotherapy'" filter Reports.jsx's
    // no-show rate already uses (§10.10) — just scoped to today here.
    const physioSessionsToday = state.appointments.filter((a) => a.reason === 'Session' && a.department === 'Physiotherapy' && a.date === todayStr).length

    // Staff workload (§12): open tasks per assignee, top 10, keyed by
    // assignedUserId per the blueprint's own phrasing (not acceptedBy —
    // assignedUserId is set on reassignment/creation, acceptedBy only once
    // claimed; the blueprint wants who OWNS the load, not just who's started it).
    const workloadCounts = {}
    state.tasks
      .filter((t) => !['Completed', 'Cancelled'].includes(t.status) && t.assignedUserId)
      .forEach((t) => { workloadCounts[t.assignedUserId] = (workloadCounts[t.assignedUserId] || 0) + 1 })
    const staffWorkload = Object.entries(workloadCounts)
      .map(([userId, count]) => ({ userId, name: state.users.find((u) => u.id === userId)?.name || userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      opdVisitsToday, occupied, totalBeds, occupancyPct, admissionsToday, dischargesToday, revenueToday, revenueMtd, pendingDues,
      pendingApprovalsCount: pendingApprovals.length, oldestApprovalHours, dischargeBlocked,
      labPending: labOpen.length, labStale, toDispense, pharmacyAlerts, openCriticalTasks,
      departmentLoad,
      therapiesScheduledToday, therapiesCompletedToday, dentalProceduresWeek, physioActivePlans, physioSessionsToday, staffWorkload,
    }
  }, [state])

  return (
    <>
      <PageHeader title="Management Command Center" subtitle="Hospital pulse, flow, department load and clinical operations" icon={Radar} />

      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink/40">Hospital Pulse</div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <Link to="/patients" className="block">
          <StatCard label="OPD Visits Today" value={data.opdVisitsToday} icon={CalendarDays} tone="sky" />
        </Link>
        <Link to="/ipd" className="block">
          <StatCard label="IPD Occupancy" value={`${data.occupancyPct}%`} icon={BedDouble} tone="gold" sub={`${data.occupied} of ${data.totalBeds} beds`} />
        </Link>
        <Link to="/ipd" className="block">
          <StatCard label="Admissions / Discharges" value={`${data.admissionsToday} / ${data.dischargesToday}`} icon={ArrowRightCircle} tone="brand" sub="Today" />
        </Link>
        <Link to="/billing" className="block">
          <StatCard label="Revenue Today / MTD" value={inr(data.revenueToday)} icon={IndianRupee} tone="brand" sub={`${inr(data.revenueMtd)} month to date`} />
        </Link>
        <Link to="/billing" className="block">
          <StatCard label="Pending Dues" value={inr(data.pendingDues)} icon={IndianRupee} tone="rose" />
        </Link>
      </div>

      <div className="mb-2 mt-8 text-[11px] font-semibold uppercase tracking-wide text-ink/40">Flow &amp; Delays</div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <Link to="/approvals" className="block">
          <StatCard
            label="Pending Approvals" value={data.pendingApprovalsCount} icon={Clock} tone="gold"
            sub={data.oldestApprovalHours == null ? 'None pending' : `Oldest ${Math.round(data.oldestApprovalHours)}h`}
          />
        </Link>
        <Link to="/ipd" className="block">
          <StatCard label="Discharge Ready, Blocked" value={data.dischargeBlocked} icon={LogOut} tone="rose" sub="Clinical done, other gates pending" />
        </Link>
        <Link to="/lab" className="block">
          <StatCard label="Lab Pending" value={data.labPending} icon={FlaskConical} tone="sky" sub={`${data.labStale} over ${LAB_STALE_HOURS}h`} />
        </Link>
        <Link to="/pharmacy" className="block">
          <StatCard label="Pharmacy Queue" value={data.toDispense} icon={Pill} tone="gold" sub={`${data.pharmacyAlerts} stock alert(s)`} />
        </Link>
        <Link to="/tasks" className="block">
          <StatCard label="Open Critical Tasks" value={data.openCriticalTasks} icon={AlertTriangle} tone="rose" />
        </Link>
      </div>

      <div className="mb-2 mt-8 text-[11px] font-semibold uppercase tracking-wide text-ink/40">Department Load</div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-cream/60">
              <tr>
                <th className="th">Department</th>
                <th className="th text-right">Appts Today</th>
                <th className="th text-right">Open Tasks</th>
                <th className="th text-right">Oldest Task</th>
                <th className="th text-right">Revenue MTD</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {data.departmentLoad.map((d) => (
                <tr key={d.code} className="hover:bg-cream/40">
                  <td className="td">
                    <Link to={`/departments/${d.code}`} className="flex items-center gap-2 font-medium text-brand-900 hover:text-brand-700 hover:underline">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${departmentDotClass(state, d.code)}`} />
                      {d.name}
                    </Link>
                  </td>
                  <td className="td text-right">{d.apptsToday}</td>
                  <td className="td text-right">{d.openTaskCount}</td>
                  <td className="td text-right">{d.oldestTaskHours == null ? '—' : `${Math.round(d.oldestTaskHours)}h`}</td>
                  <td className="td text-right">{inr(d.revMtd)}</td>
                  <td className="td text-right">{d.bottleneck && <Badge tone="rose">Bottleneck</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-2 mt-8 text-[11px] font-semibold uppercase tracking-wide text-ink/40">Clinical Operations</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link to="/therapy" className="block">
          <StatCard
            label="Therapy Sessions Today" value={`${data.therapiesScheduledToday} / ${data.therapiesCompletedToday}`}
            icon={Flower2} tone="brand" sub="Scheduled / completed"
          />
        </Link>
        <Link to="/departments/DENT" className="block">
          <StatCard label="Dental Procedures This Week" value={data.dentalProceduresWeek} icon={Smile} tone="sky" />
        </Link>
        <Link to="/departments/PHYS" className="block">
          <StatCard
            label="Physio Active Plans" value={data.physioActivePlans} icon={Activity} tone="gold"
            sub={`${data.physioSessionsToday} session(s) today`}
          />
        </Link>
      </div>

      <div className="mt-4 card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-sand p-4">
          <Users size={16} className="text-brand-700" />
          <h3 className="text-sm font-semibold text-brand-900">Staff Workload — Top 10 Open Tasks</h3>
        </div>
        {data.staffWorkload.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink/40">No open tasks assigned to a specific person right now.</p>
        ) : (
          <table className="w-full">
            <thead className="bg-cream/60"><tr><th className="th">Staff Member</th><th className="th text-right">Open Tasks</th></tr></thead>
            <tbody className="divide-y divide-sand">
              {data.staffWorkload.map((s) => (
                <tr key={s.userId} className="hover:bg-cream/40">
                  <td className="td font-medium text-brand-900">{s.name}</td>
                  <td className="td text-right">{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
