import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { BarChart3, Users, CalendarCheck, IndianRupee, Pill, FlaskConical, BedDouble, Flower2, Download, Smile, Activity, TrendingDown, UserX, PackageCheck, Timer, AlertTriangle } from 'lucide-react'
import { useHospital, useLookups } from '../store/HospitalContext'
import { PageHeader, StatCard, Field, Input, Badge } from '../components/ui/primitives'
import { inr, formatDate, today } from '../lib/utils'
import { computeBill } from '../lib/billing'
import { exportCsv } from '../lib/csv'

const GREENS = ['#21664c', '#2f8060', '#4e9d78', '#7dbd9d', '#d8a73e', '#c08f2b', '#a07423']

// Diagnostics TAT (§11 Phase 7d) — pure ISO-timestamp arithmetic, hoisted so
// both the report's aggregation and its CSV export share one implementation.
const hoursBetween = (a, b) => (new Date(b) - new Date(a)) / 36e5

export default function Reports() {
  const { state } = useHospital()
  const { patientName, doctorName } = useLookups()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const inRange = (d) => (!from || d >= from) && (!to || d <= to)
  const billTotal = (b) => b.total ?? computeBill({ items: b.items, discountType: b.discountType, discountValue: b.discountValue, gstRate: b.gstRate }).grandTotal

  const data = useMemo(() => {
    const bills = state.bills.filter((b) => inRange(b.date))
    const revenue = bills.reduce((s, b) => s + (b.paidAmount || 0), 0)
    const billed = bills.reduce((s, b) => s + billTotal(b), 0)

    const byDeptRevenue = {}
    bills.forEach((b) => { byDeptRevenue[b.department] = (byDeptRevenue[b.department] || 0) + billTotal(b) })
    const revenueData = Object.entries(byDeptRevenue).map(([name, value]) => ({ name, value }))

    const byDeptPatients = {}
    state.patients.forEach((p) => { byDeptPatients[p.department] = (byDeptPatients[p.department] || 0) + 1 })
    const patientData = Object.entries(byDeptPatients).map(([name, value]) => ({ name, value }))

    const ayur = state.medicines.filter((m) => m.category === 'ayurveda').reduce((s, m) => s + m.stock, 0)
    const modern = state.medicines.filter((m) => m.category === 'modern').reduce((s, m) => s + m.stock, 0)

    const activeIpd = state.episodes.filter((e) => e.type === 'IPD' && e.status === 'admitted').length
    const discharged = state.episodes.filter((e) => e.type === 'IPD' && e.status === 'discharged').length
    const conversions = state.episodes.filter((e) => e.type === 'IPD' && e.convertedFrom).length
    const opdCount = new Set(state.episodes.filter((e) => e.type === 'OPD').map((e) => e.patientId)).size

    // Dental (§9.9) — procedure-plan items, all derived, no new collection needed here.
    const dentalItems = (state.procedurePlans || []).flatMap((p) =>
      p.items.map((i) => ({ ...i, planId: p.id, patientId: p.patientId, mrn: p.mrn }))
    )
    const dentalCompleted = dentalItems.filter((i) => i.status === 'completed' && inRange((i.completedAt || '').slice(0, 10)))
    const dentalRevenue = dentalCompleted.reduce((s, i) => s + (i.estAmount || 0), 0)

    const byProcedure = {}
    dentalCompleted.forEach((i) => {
      const row = byProcedure[i.procedureName] || { count: 0, value: 0 }
      row.count += 1
      row.value += i.estAmount || 0
      byProcedure[i.procedureName] = row
    })
    const dentalProcedureData = Object.entries(byProcedure)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count)

    const dentalFollowupTasks = state.tasks.filter((t) => t.type === 'dental-followup' && inRange((t.createdAt || '').slice(0, 10)))
    const dentalFollowupDone = dentalFollowupTasks.filter((t) => t.status === 'Completed').length
    const dentalFollowupRate = dentalFollowupTasks.length
      ? Math.round((dentalFollowupDone / dentalFollowupTasks.length) * 100)
      : null

    // Physiotherapy (§10.9/10.10) — outcome tracking + Reports metrics,
    // all derived from Phase 6a-6d's collections, no new storage needed.
    const physioReferrals = state.tasks.filter((t) => t.type === 'physio-referral' && inRange((t.createdAt || '').slice(0, 10)))
    const referralsBySource = {}
    physioReferrals.forEach((t) => { referralsBySource[t.sourceRole || 'unknown'] = (referralsBySource[t.sourceRole || 'unknown'] || 0) + 1 })

    const physioSessionTasks = state.tasks.filter((t) => t.type === 'physio-session')
    const completedSessions = physioSessionTasks.filter((t) => t.status === 'Completed' && inRange((t.completedAt || '').slice(0, 10)))
    const sessionsByTherapist = {}
    completedSessions.forEach((t) => { sessionsByTherapist[t.acceptedBy || 'Unassigned'] = (sessionsByTherapist[t.acceptedBy || 'Unassigned'] || 0) + 1 })
    const sessionsPerTherapistData = Object.entries(sessionsByTherapist).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)

    // Current state, not date-filtered — same convention as Low Stock/Lab Pending above.
    const packages = state.packages || []
    const packagesLowBalance = packages.filter((p) => p.status === 'active' && (p.totalSessions - p.usedSessions) <= 2).length

    const completedPlans = (state.treatmentPlans || []).filter((p) => p.status === 'completed' && inRange((p.updatedAt || '').slice(0, 10)))
    const plansWithPainDelta = completedPlans.filter((p) => p.initialPainScore != null && p.closingPainScore != null)
    const avgPainReduction = plansWithPainDelta.length
      ? plansWithPainDelta.reduce((s, p) => s + (p.initialPainScore - p.closingPainScore), 0) / plansWithPainDelta.length
      : null
    const goalAchievementCounts = { met: 0, partial: 0, 'not-met': 0 }
    completedPlans.forEach((p) => { if (p.goalAchievement) goalAchievementCounts[p.goalAchievement] = (goalAchievementCounts[p.goalAchievement] || 0) + 1 })

    const physioBillableTotal = state.billableItems
      .filter((b) => b.department === 'Physiotherapy' && inRange((b.createdAt || '').slice(0, 10)))
      .reduce((s, b) => s + (b.amount || 0), 0)
    const physioPackageRevenue = packages
      .filter((p) => inRange((p.createdAt || '').slice(0, 10)))
      .reduce((s, p) => s + (p.amount || 0), 0)
    const physioRevenue = physioBillableTotal + physioPackageRevenue

    // No-show is approximated (§10.10) — the appointment model has no
    // dedicated no-show status, so "past its date, never completed or
    // cancelled" is the closest honest proxy from existing data.
    const pastSessions = state.appointments.filter((a) => a.reason === 'Session' && a.department === 'Physiotherapy' && a.date < today())
    const noShowSessions = pastSessions.filter((a) => a.status === 'scheduled')
    const noShowRate = pastSessions.length ? Math.round((noShowSessions.length / pastSessions.length) * 100) : null

    // Diagnostics / TAT (§11 Phase 7d) — turnaround between the sample-state
    // pipeline's timestamps (7a/7c). ordered→collected is an approximation:
    // requestedOn is date-only (no time component), unlike collectedAt/
    // resultedAt/acknowledgedAt which are full ISO timestamps set by the
    // verbs themselves — same honest-proxy convention as 6e's no-show rate,
    // not a precise reading. The other two intervals are exact.
    const labInRange = state.labTests.filter((t) => inRange(t.requestedOn))
    const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null)
    const avgOrderToCollect = avg(
      labInRange.filter((t) => t.collectedAt)
        .map((t) => hoursBetween(`${t.requestedOn}T00:00:00`, t.collectedAt))
        .filter((h) => h >= 0)
    )
    const avgCollectToResult = avg(
      labInRange.filter((t) => t.collectedAt && t.resultedAt).map((t) => hoursBetween(t.collectedAt, t.resultedAt))
    )
    const avgResultToAck = avg(
      labInRange.filter((t) => t.resultedAt && t.acknowledgedAt).map((t) => hoursBetween(t.resultedAt, t.acknowledgedAt))
    )
    const labStatusCounts = {}
    labInRange.forEach((t) => { labStatusCounts[t.status] = (labStatusCounts[t.status] || 0) + 1 })
    const criticalCount = labInRange.filter((t) => t.critical).length

    return {
      revenue, billed, revenueData, patientData,
      stockData: [{ name: 'Ayurveda', value: ayur }, { name: 'Modern', value: modern }],
      lowStock: state.medicines.filter((m) => m.stock <= m.reorderLevel).length,
      labPending: state.labTests.filter((t) => !['acknowledged', 'cancelled'].includes(t.status)).length,
      pendingDues: billed - revenue,
      activeIpd, discharged, conversions, opdCount,
      therapyDone: state.therapies.filter((t) => t.status === 'completed').length,
      occupancy: state.beds.length ? Math.round((state.beds.filter((b) => b.status === 'occupied').length / state.beds.length) * 100) : 0,
      dentalItems, dentalCompleted, dentalRevenue, dentalProcedureData,
      dentalFollowupTasks, dentalFollowupDone, dentalFollowupRate,
      physioReferrals, referralsBySource, sessionsPerTherapistData, packages, packagesLowBalance,
      completedPlans, avgPainReduction, goalAchievementCounts, physioRevenue, noShowRate, pastSessions,
      labInRange, avgOrderToCollect, avgCollectToResult, avgResultToAck, labStatusCounts, criticalCount,
    }
  }, [state, from, to])

  // ── CSV exports ──
  const csvPatients = () => exportCsv('patients', [
    { label: 'MRN', value: 'mrn' }, { label: 'Name', value: 'name' }, { label: 'Name (AR)', value: 'nameAr' },
    { label: 'Age', value: 'age' }, { label: 'Gender', value: 'gender' }, { label: 'Phone', value: 'phone' },
    { label: 'Department', value: 'department' }, { label: 'Language', value: 'preferredLanguage' },
  ], state.patients)

  const csvBilling = () => exportCsv('billing', [
    { label: 'Invoice', value: 'invoiceNo' }, { label: 'Type', value: 'billType' },
    { label: 'Patient', value: (b) => patientName(b.patientId) }, { label: 'MRN', value: (b) => state.patients.find((p) => p.id === b.patientId)?.mrn || '' },
    { label: 'Department', value: 'department' }, { label: 'Date', value: 'date' },
    { label: 'Discount', value: (b) => computeBill({ items: b.items, discountType: b.discountType, discountValue: b.discountValue, gstRate: b.gstRate }).discountAmount },
    { label: 'GST', value: (b) => computeBill({ items: b.items, discountType: b.discountType, discountValue: b.discountValue, gstRate: b.gstRate }).gstAmount },
    { label: 'Grand Total', value: (b) => billTotal(b) }, { label: 'Paid', value: 'paidAmount' },
    { label: 'Balance', value: (b) => billTotal(b) - (b.paidAmount || 0) }, { label: 'Status', value: 'status' },
  ], state.bills.filter((b) => inRange(b.date)))

  const csvAppointments = () => exportCsv('appointments', [
    { label: 'Date', value: 'date' }, { label: 'Time', value: 'time' },
    { label: 'Patient', value: (a) => patientName(a.patientId) }, { label: 'Doctor', value: (a) => doctorName(a.doctorId) },
    { label: 'Department', value: 'department' }, { label: 'Reason', value: 'reason' }, { label: 'Status', value: 'status' },
  ], state.appointments.filter((a) => inRange(a.date)))

  const csvIpd = () => exportCsv('ipd_records', [
    { label: 'IPD Ref', value: 'refNo' }, { label: 'MRN', value: 'mrn' },
    { label: 'Patient', value: (e) => patientName(e.patientId) }, { label: 'Ward', value: 'ward' },
    { label: 'Admitted', value: 'admitDate' }, { label: 'Expected Discharge', value: 'expectedDischarge' },
    { label: 'Discharged', value: (e) => e.dischargeDate || '' }, { label: 'Diagnosis', value: 'diagnosis' },
    { label: 'Status', value: 'status' }, { label: 'Converted', value: (e) => (e.convertedFrom ? 'Yes' : 'No') },
  ], state.episodes.filter((e) => e.type === 'IPD'))

  const csvTherapy = () => exportCsv('panchakarma_therapy', [
    { label: 'Therapy', value: 'type' }, { label: 'Patient', value: (t) => patientName(t.patientId) },
    { label: 'Therapist', value: (t) => doctorName(t.therapistId) }, { label: 'Date', value: 'date' },
    { label: 'Cost', value: 'cost' }, { label: 'Status', value: 'status' },
  ], state.therapies.filter((t) => inRange(t.date)))

  const csvDental = () => exportCsv('dental_procedures', [
    { label: 'Procedure', value: 'procedureName' }, { label: 'Patient', value: (i) => patientName(i.patientId) },
    { label: 'MRN', value: 'mrn' }, { label: 'Tooth', value: (i) => i.tooth || '' },
    { label: 'Phase', value: (i) => i.phase || '' }, { label: 'Completed', value: (i) => (i.completedAt || '').slice(0, 10) },
    { label: 'Amount', value: 'estAmount' },
  ], data.dentalCompleted)

  const csvPhysio = () => exportCsv('physio_outcomes', [
    { label: 'Patient', value: (p) => patientName(p.patientId) }, { label: 'MRN', value: 'mrn' },
    { label: 'Diagnosis', value: 'diagnosis' }, { label: 'Initial Pain', value: 'initialPainScore' },
    { label: 'Closing Pain', value: 'closingPainScore' }, { label: 'Goal Achievement', value: 'goalAchievement' },
    { label: 'Functional Score', value: 'functionalScore' }, { label: 'Completed', value: (p) => (p.updatedAt || '').slice(0, 10) },
  ], data.completedPlans)

  const csvDiagnostics = () => exportCsv('diagnostics_tat', [
    { label: 'Test', value: 'testName' }, { label: 'Patient', value: (t) => patientName(t.patientId) },
    { label: 'Requested', value: 'requestedOn' }, { label: 'Status', value: 'status' },
    { label: 'Panel', value: (t) => t.panelLabel || '' },
    { label: 'Collected→Resulted (h)', value: (t) => (t.collectedAt && t.resultedAt) ? hoursBetween(t.collectedAt, t.resultedAt).toFixed(1) : '' },
    { label: 'Resulted→Acknowledged (h)', value: (t) => (t.resultedAt && t.acknowledgedAt) ? hoursBetween(t.resultedAt, t.acknowledgedAt).toFixed(1) : '' },
    { label: 'Critical', value: (t) => (t.critical ? 'Yes' : 'No') },
  ], data.labInRange)

  const exports = [
    ['Patients', csvPatients], ['Billing', csvBilling], ['Appointments', csvAppointments],
    ['IPD Records', csvIpd], ['Panchakarma', csvTherapy], ['Dental Procedures', csvDental], ['Physio Outcomes', csvPhysio],
    ['Diagnostics TAT', csvDiagnostics],
  ]

  return (
    <>
      <PageHeader title="Management Reports" subtitle="Hospital-wide performance, exports & summaries" icon={BarChart3} />

      {/* Date range + exports */}
      <div className="card mb-6 p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div><span className="label">From</span><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" /></div>
            <div><span className="label">To</span><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" /></div>
            {(from || to) && <button className="btn-ghost btn-sm" onClick={() => { setFrom(''); setTo('') }}>Clear</button>}
          </div>
          <div className="flex flex-wrap gap-2">
            {exports.map(([label, fn]) => (
              <button key={label} className="btn-outline btn-sm" onClick={fn}><Download size={14} /> {label} CSV</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Patients" value={state.patients.length} icon={Users} />
        <StatCard label="Revenue" value={inr(data.revenue)} icon={IndianRupee} />
        <StatCard label="Pending Dues" value={inr(data.pendingDues)} icon={IndianRupee} tone="rose" />
        <StatCard label="Active IPD" value={data.activeIpd} icon={BedDouble} tone="sky" />
        <StatCard label="Bed Occupancy" value={`${data.occupancy}%`} icon={BedDouble} tone="gold" />
        <StatCard label="OPD→IPD" value={data.conversions} icon={BedDouble} tone="brand" />
        <StatCard label="Discharged" value={data.discharged} icon={BedDouble} />
        <StatCard label="Therapy Done" value={data.therapyDone} icon={Flower2} tone="brand" />
        <StatCard label="Low Stock" value={data.lowStock} icon={Pill} tone="rose" />
        <StatCard label="Lab Pending" value={data.labPending} icon={FlaskConical} tone="sky" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Revenue by Department">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.revenueData} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#efe9db" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#1d272399' }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 11, fill: '#1d272399' }} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 12, border: '1px solid #efe9db' }} />
              <Bar dataKey="value" fill="#21664c" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Patients by Department">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.patientData} dataKey="value" nameKey="name" outerRadius={95} label>
                {data.patientData.map((_, i) => <Cell key={i} fill={GREENS[i % GREENS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #efe9db' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pharmacy Stock — Ayurveda vs Modern">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.stockData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                <Cell fill="#21664c" /><Cell fill="#d8a73e" />
              </Pie>
              <Legend /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #efe9db' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="card p-5">
          <h3 className="mb-4 font-semibold text-brand-900">Patient Mix</h3>
          <div className="grid grid-cols-2 gap-4">
            <Mix label="OPD patients" value={data.opdCount} tone="text-slate-600" />
            <Mix label="Active IPD" value={data.activeIpd} tone="text-sky-600" />
            <Mix label="OPD→IPD conversions" value={data.conversions} tone="text-brand-700" />
            <Mix label="Discharged IPD" value={data.discharged} tone="text-gold-600" />
          </div>
        </div>
      </div>

      {/* Dental (§9.9) */}
      <div className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <Smile size={18} className="text-sky-600" />
          <h2 className="font-display text-lg font-semibold text-brand-900">Dental</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Procedures Completed" value={data.dentalCompleted.length} icon={Smile} tone="sky" />
          <StatCard label="Procedure Value" value={inr(data.dentalRevenue)} icon={IndianRupee} sub="Billed from completed items" />
          <StatCard
            label="Follow-up Compliance"
            value={data.dentalFollowupRate == null ? '—' : `${data.dentalFollowupRate}%`}
            icon={CalendarCheck}
            tone="gold"
            sub={data.dentalFollowupTasks.length ? `${data.dentalFollowupDone} of ${data.dentalFollowupTasks.length} closed` : 'No follow-ups raised'}
          />
          <StatCard label="Procedure Types" value={data.dentalProcedureData.length} icon={Smile} />
        </div>

        <div className="mt-4 card overflow-hidden">
          <div className="border-b border-sand p-4"><h3 className="text-sm font-semibold text-brand-900">Top Procedures</h3></div>
          {data.dentalProcedureData.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink/40">No completed dental procedures in this period.</p>
          ) : (
            <table className="w-full">
              <thead className="bg-cream/60"><tr>
                <th className="th">Procedure</th><th className="th text-right">Completed</th><th className="th text-right">Value</th>
              </tr></thead>
              <tbody className="divide-y divide-sand">
                {data.dentalProcedureData.map((row) => (
                  <tr key={row.name} className="hover:bg-cream/40">
                    <td className="td font-medium text-brand-900">{row.name}</td>
                    <td className="td text-right">{row.count}</td>
                    <td className="td text-right">{inr(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Physiotherapy (§10.10) */}
      <div className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <Activity size={18} className="text-gold-600" />
          <h2 className="font-display text-lg font-semibold text-brand-900">Physiotherapy</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Avg Pain Reduction"
            value={data.avgPainReduction == null ? '—' : data.avgPainReduction.toFixed(1)}
            icon={TrendingDown} tone="brand"
            sub={data.completedPlans.length ? `Across ${data.completedPlans.length} completed plan(s)` : 'No completed plans yet'}
          />
          <StatCard label="Physio Revenue" value={inr(data.physioRevenue)} icon={IndianRupee} sub="Sessions + packages billed" />
          <StatCard
            label="No-Show Rate"
            value={data.noShowRate == null ? '—' : `${data.noShowRate}%`}
            icon={UserX} tone="rose"
            sub={data.pastSessions.length ? `${data.pastSessions.length} past session(s)` : 'No past sessions yet'}
          />
          <StatCard label="Packages Near Renewal" value={data.packagesLowBalance} icon={PackageCheck} tone="gold" sub={`${data.packages.length} package(s) total`} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card overflow-hidden">
            <div className="border-b border-sand p-4"><h3 className="text-sm font-semibold text-brand-900">Sessions per Therapist</h3></div>
            {data.sessionsPerTherapistData.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink/40">No completed sessions in this period.</p>
            ) : (
              <table className="w-full">
                <thead className="bg-cream/60"><tr><th className="th">Therapist</th><th className="th text-right">Sessions Completed</th></tr></thead>
                <tbody className="divide-y divide-sand">
                  {data.sessionsPerTherapistData.map((row) => (
                    <tr key={row.name} className="hover:bg-cream/40">
                      <td className="td font-medium text-brand-900">{row.name}</td>
                      <td className="td text-right">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-sand p-4"><h3 className="text-sm font-semibold text-brand-900">Referrals by Source Role</h3></div>
            {data.physioReferrals.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink/40">No referrals in this period.</p>
            ) : (
              <table className="w-full">
                <thead className="bg-cream/60"><tr><th className="th">Source Role</th><th className="th text-right">Referrals</th></tr></thead>
                <tbody className="divide-y divide-sand">
                  {Object.entries(data.referralsBySource).sort((a, b) => b[1] - a[1]).map(([role, count]) => (
                    <tr key={role} className="hover:bg-cream/40">
                      <td className="td font-medium capitalize text-brand-900">{role}</td>
                      <td className="td text-right">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="mt-4 card overflow-hidden">
          <div className="border-b border-sand p-4"><h3 className="text-sm font-semibold text-brand-900">Package Utilization</h3></div>
          {data.packages.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink/40">No packages started yet.</p>
          ) : (
            <table className="w-full">
              <thead className="bg-cream/60"><tr>
                <th className="th">Patient</th><th className="th">Package</th><th className="th text-right">Used</th><th className="th">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-sand">
                {data.packages.map((p) => (
                  <tr key={p.id} className="hover:bg-cream/40">
                    <td className="td">{patientName(p.patientId)}</td>
                    <td className="td font-medium text-brand-900">{p.name}</td>
                    <td className="td text-right">{p.usedSessions} of {p.totalSessions}</td>
                    <td className="td"><Badge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {data.completedPlans.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-ink/60">
            <span>Goal achievement — </span>
            <Badge tone="green">Met: {data.goalAchievementCounts.met}</Badge>
            <Badge tone="gold">Partial: {data.goalAchievementCounts.partial}</Badge>
            <Badge tone="rose">Not met: {data.goalAchievementCounts['not-met']}</Badge>
          </div>
        )}
      </div>

      {/* Diagnostics / TAT (§11 Phase 7d) */}
      <div className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <Timer size={18} className="text-brand-700" />
          <h2 className="font-display text-lg font-semibold text-brand-900">Diagnostics — Turnaround Time</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Avg. Order → Collect" value={data.avgOrderToCollect == null ? '—' : `${data.avgOrderToCollect.toFixed(1)}h`}
            icon={Timer} tone="sky" sub="Approximate — order date has no time component"
          />
          <StatCard
            label="Avg. Collect → Result" value={data.avgCollectToResult == null ? '—' : `${data.avgCollectToResult.toFixed(1)}h`}
            icon={FlaskConical} tone="brand"
          />
          <StatCard
            label="Avg. Result → Acknowledge" value={data.avgResultToAck == null ? '—' : `${data.avgResultToAck.toFixed(1)}h`}
            icon={CalendarCheck} tone="gold"
          />
          <StatCard label="Critical Results" value={data.criticalCount} icon={AlertTriangle} tone="rose" sub={`${data.labInRange.length} test(s) in period`} />
        </div>

        <div className="mt-4 card overflow-hidden">
          <div className="border-b border-sand p-4"><h3 className="text-sm font-semibold text-brand-900">Tests by Sample State</h3></div>
          {data.labInRange.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink/40">No lab tests requested in this period.</p>
          ) : (
            <table className="w-full">
              <thead className="bg-cream/60"><tr><th className="th">State</th><th className="th text-right">Tests</th></tr></thead>
              <tbody className="divide-y divide-sand">
                {Object.entries(data.labStatusCounts).map(([status, count]) => (
                  <tr key={status} className="hover:bg-cream/40">
                    <td className="td"><Badge status={status} /></td>
                    <td className="td text-right">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}

function ChartCard({ title, children }) {
  return <div className="card p-5"><h3 className="mb-4 font-semibold text-brand-900">{title}</h3>{children}</div>
}
function Mix({ label, value, tone }) {
  return (
    <div className="rounded-xl bg-cream/60 p-4">
      <p className={`font-display text-3xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-1 text-sm text-ink/50">{label}</p>
    </div>
  )
}
