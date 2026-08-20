// ─────────────────────────────────────────────────────────────
// Management Command Center (§12 Phase 9) — the dashboard variant the
// `management` role lands on instead of the generic Dashboard. All v1
// numbers are computable from existing state, per §12's own framing; this
// step (9a) covers the page scaffold and Row 1 (hospital pulse) only.
// Rows 2-4 and the alerts rail follow in 9b-9d.
//
// Every tile links to its owning module page (never a dead-end number),
// matching the click-through convention already established in Phase 8b —
// the owning page, not a deep link to a specific filtered record.
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Radar, CalendarDays, BedDouble, ArrowRightCircle, IndianRupee } from 'lucide-react'
import { useHospital } from '../store/HospitalContext'
import { PageHeader, StatCard } from '../components/ui/primitives'
import { inr, today } from '../lib/utils'
import { computeBill } from '../lib/billing'

const billTotal = (b) => b.total ?? computeBill({
  items: b.items, discountType: b.discountType, discountValue: b.discountValue, gstRate: b.gstRate,
}).grandTotal

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

    return { opdVisitsToday, occupied, totalBeds, occupancyPct, admissionsToday, dischargesToday, revenueToday, revenueMtd, pendingDues }
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
    </>
  )
}
