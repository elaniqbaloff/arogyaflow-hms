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
  Clock, LogOut, FlaskConical, Pill, AlertTriangle,
} from 'lucide-react'
import { useHospital } from '../store/HospitalContext'
import { PageHeader, StatCard } from '../components/ui/primitives'
import { inr, today } from '../lib/utils'
import { computeBill } from '../lib/billing'
import { emptyClearance, allGatesCleared } from '../services/discharge'

const billTotal = (b) => b.total ?? computeBill({
  items: b.items, discountType: b.discountType, discountValue: b.discountValue, gstRate: b.gstRate,
}).grandTotal

const hoursBetween = (a, b) => (new Date(b) - new Date(a)) / 36e5
const LAB_STALE_HOURS = 24

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

    return {
      opdVisitsToday, occupied, totalBeds, occupancyPct, admissionsToday, dischargesToday, revenueToday, revenueMtd, pendingDues,
      pendingApprovalsCount: pendingApprovals.length, oldestApprovalHours, dischargeBlocked,
      labPending: labOpen.length, labStale, toDispense, pharmacyAlerts, openCriticalTasks,
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
    </>
  )
}
