import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Users, CalendarDays, Stethoscope, Pill, FlaskConical, Receipt,
  TrendingUp, AlertTriangle, IndianRupee, Activity, BedDouble, Flower2,
} from 'lucide-react'
import { useAuth } from '../store/AuthContext'
import { useHospital, useLookups } from '../store/HospitalContext'
import { PageHeader, StatCard, Badge } from '../components/ui/primitives'
import { inr, today, formatDate } from '../lib/utils'
import { roleLabel } from '../config/roles'
import { scopeFilter } from '../services/accessPolicy'

const GREENS = ['#21664c', '#2f8060', '#4e9d78', '#7dbd9d', '#d8a73e', '#c08f2b']

export default function Dashboard() {
  const { user } = useAuth()
  const { state } = useHospital()
  const { patientName } = useLookups()

  const m = useMemo(() => {
    const todayStr = today()
    const scopedPatients = state.patients.filter(scopeFilter(user, state, 'patients'))
    const scopedAppointments = state.appointments.filter(scopeFilter(user, state, 'appointments'))
    const scopedConsultations = state.consultations.filter(scopeFilter(user, state, 'consultations'))

    const todays = scopedAppointments.filter((a) => a.date === todayStr)
    const revenue = state.bills.reduce((s, b) => s + (b.paidAmount || 0), 0)
    const pendingDues = state.bills.reduce(
      (s, b) => s + (b.total - (b.paidAmount || 0)),
      0
    )
    const lowStock = state.medicines.filter((x) => x.stock <= x.reorderLevel)
    const pendingRx = state.prescriptions.filter((p) => p.status === 'pending')
    const pendingLab = state.labTests.filter((t) => !['acknowledged', 'cancelled'].includes(t.status))
    const pendingCons = scopedConsultations.filter((c) => c.status === 'pending')

    // revenue by department
    const byDept = {}
    state.bills.forEach((b) => {
      byDept[b.department] = (byDept[b.department] || 0) + b.total
    })
    const deptData = Object.entries(byDept).map(([name, value]) => ({ name, value }))

    // appointment status split
    const statusCount = {}
    scopedAppointments.forEach((a) => {
      statusCount[a.status] = (statusCount[a.status] || 0) + 1
    })
    const statusData = Object.entries(statusCount).map(([name, value]) => ({ name, value }))

    // IPD / bed / therapy
    const activeIpd = state.episodes.filter((e) => e.type === 'IPD' && e.status === 'admitted')
    const conversions = state.episodes.filter((e) => e.type === 'IPD' && e.convertedFrom)
    const availableBeds = state.beds.filter((b) => b.status === 'available').length
    const occupiedBeds = state.beds.filter((b) => b.status === 'occupied').length
    const todaysTherapy = state.therapies.filter((t) => t.date === todayStr)

    return {
      totalPatients: scopedPatients.length,
      todays, revenue, pendingDues, lowStock, pendingRx, pendingLab, pendingCons,
      deptData, statusData,
      activeIpd, conversions, availableBeds, occupiedBeds, todaysTherapy,
    }
  }, [state, user])

  const greeting = `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}`

  // Pick KPI set by role.
  const role = user.role
  const showFinance = ['admin', 'management', 'finance'].includes(role)
  const showClinical = ['admin', 'management', 'doctor', 'reception', 'dentist', 'physiotherapist'].includes(role)
  const showPharmacy = ['admin', 'management', 'pharmacy'].includes(role)
  const showLab = ['admin', 'management', 'lab'].includes(role)
  const showIpd = ['admin', 'management', 'doctor', 'nurse', 'reception'].includes(role)
  const showTherapy = ['admin', 'management', 'doctor', 'nurse'].includes(role)

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user.name.split(' ')[0]}`}
        subtitle={`${roleLabel(role)} · ${formatDate(today())}`}
        icon={Activity}
      />

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {showClinical && (
          <>
            <StatCard label="Total Patients" value={m.totalPatients} icon={Users} sub="Registered in system" />
            <StatCard label="Today's Appointments" value={m.todays.length} icon={CalendarDays} tone="sky" sub={`${m.todays.filter((a) => a.status === 'completed').length} completed`} />
          </>
        )}
        {['doctor', 'dentist', 'physiotherapist', 'admin', 'management'].includes(role) && (
          <StatCard label="Pending Consultations" value={m.pendingCons.length} icon={Stethoscope} tone="gold" sub="Awaiting notes" />
        )}
        {showPharmacy && (
          <>
            <StatCard label="Low-stock Medicines" value={m.lowStock.length} icon={AlertTriangle} tone="rose" sub="At or below reorder level" />
            <StatCard label="Prescriptions to Dispense" value={m.pendingRx.length} icon={Pill} tone="gold" />
          </>
        )}
        {showLab && (
          <StatCard label="Pending Lab Tests" value={m.pendingLab.length} icon={FlaskConical} tone="sky" sub="Ordered / collected / resulted" />
        )}
        {showFinance && (
          <>
            <StatCard label="Revenue Collected" value={inr(m.revenue)} icon={IndianRupee} sub="Across all paid bills" />
            <StatCard label="Pending Dues" value={inr(m.pendingDues)} icon={Receipt} tone="rose" sub="Awaiting payment" />
          </>
        )}
      </div>

      {/* IPD / bed / therapy KPI row */}
      {(showIpd || showTherapy) && (
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {showIpd && <StatCard label="Active IPD Patients" value={m.activeIpd.length} icon={BedDouble} tone="sky" />}
          {showIpd && <StatCard label="Available Beds" value={m.availableBeds} icon={BedDouble} tone="brand" />}
          {showIpd && <StatCard label="Occupied Beds" value={m.occupiedBeds} icon={BedDouble} tone="rose" />}
          {showIpd && <StatCard label="OPD→IPD Conversions" value={m.conversions.length} icon={Activity} tone="gold" />}
          {showTherapy && <StatCard label="Today's Panchakarma" value={m.todaysTherapy.length} icon={Flower2} tone="brand" />}
        </div>
      )}

      {/* Charts row — management/finance/admin */}
      {(showFinance || role === 'management' || role === 'admin') && (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-brand-900">Revenue by Department</h3>
              <TrendingUp size={18} className="text-brand-400" />
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={m.deptData} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#efe9db" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#1d272399' }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: '#1d272399' }} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 12, border: '1px solid #efe9db' }} />
                <Bar dataKey="value" fill="#21664c" radius={[6, 6, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h3 className="mb-4 font-semibold text-brand-900">Appointments by Status</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={m.statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {m.statusData.map((_, i) => (
                    <Cell key={i} fill={GREENS[i % GREENS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #efe9db' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Today's schedule — clinical roles */}
      {showClinical && (
        <div className="mt-6 card overflow-hidden">
          <div className="flex items-center justify-between border-b border-sand px-5 py-4">
            <h3 className="font-semibold text-brand-900">Today's Appointments</h3>
            <Link to="/appointments" className="text-sm font-medium text-brand-700 hover:underline">
              View all →
            </Link>
          </div>
          {m.todays.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink/40">No appointments scheduled for today.</p>
          ) : (
            <table className="w-full">
              <thead className="bg-cream/60">
                <tr>
                  <th className="th">Time</th>
                  <th className="th">Patient</th>
                  <th className="th">Department</th>
                  <th className="th">Reason</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {m.todays.map((a) => (
                  <tr key={a.id} className="hover:bg-cream/40">
                    <td className="td font-medium text-brand-800">{a.time}</td>
                    <td className="td">{patientName(a.patientId)}</td>
                    <td className="td">{a.department}</td>
                    <td className="td text-ink/60">{a.reason}</td>
                    <td className="td"><Badge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Low stock — pharmacy */}
      {showPharmacy && m.lowStock.length > 0 && (
        <div className="mt-6 card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-sand px-5 py-4 text-rose-700">
            <AlertTriangle size={18} />
            <h3 className="font-semibold">Low-stock Alerts</h3>
          </div>
          <table className="w-full">
            <thead className="bg-cream/60">
              <tr>
                <th className="th">Medicine</th>
                <th className="th">Category</th>
                <th className="th">In stock</th>
                <th className="th">Reorder level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {m.lowStock.map((med) => (
                <tr key={med.id} className="hover:bg-cream/40">
                  <td className="td font-medium">{med.name}</td>
                  <td className="td capitalize">{med.category}</td>
                  <td className="td"><span className="font-semibold text-rose-600">{med.stock}</span> {med.unit}</td>
                  <td className="td text-ink/50">{med.reorderLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
