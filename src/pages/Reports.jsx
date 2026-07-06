import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { BarChart3, Users, CalendarCheck, IndianRupee, Pill, FlaskConical, BedDouble, Flower2, Download } from 'lucide-react'
import { useHospital, useLookups } from '../store/HospitalContext'
import { PageHeader, StatCard, Field, Input } from '../components/ui/primitives'
import { inr, formatDate } from '../lib/utils'
import { computeBill } from '../lib/billing'
import { exportCsv } from '../lib/csv'

const GREENS = ['#21664c', '#2f8060', '#4e9d78', '#7dbd9d', '#d8a73e', '#c08f2b', '#a07423']

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

    return {
      revenue, billed, revenueData, patientData,
      stockData: [{ name: 'Ayurveda', value: ayur }, { name: 'Modern', value: modern }],
      lowStock: state.medicines.filter((m) => m.stock <= m.reorderLevel).length,
      labPending: state.labTests.filter((t) => t.status !== 'completed').length,
      pendingDues: billed - revenue,
      activeIpd, discharged, conversions, opdCount,
      therapyDone: state.therapies.filter((t) => t.status === 'completed').length,
      occupancy: state.beds.length ? Math.round((state.beds.filter((b) => b.status === 'occupied').length / state.beds.length) * 100) : 0,
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

  const exports = [
    ['Patients', csvPatients], ['Billing', csvBilling], ['Appointments', csvAppointments],
    ['IPD Records', csvIpd], ['Panchakarma', csvTherapy],
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
