import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarDays, Clock, Bell, ListChecks } from 'lucide-react'
import { useHospital, useLookups } from '../store/HospitalContext'
import { useAuth } from '../store/AuthContext'
import { roleLabel } from '../config/roles'
import { getDepartment } from '../config/departmentUtils'
import { departmentIcon } from '../config/departmentIcons'
import { canSeeTask } from '../services/taskPolicy'
import { PageHeader, StatCard, Badge, EmptyState } from '../components/ui/primitives'
import { TaskTable } from '../components/TaskTable'
import { ProcedurePlanPanel } from '../components/dental/ProcedurePlanPanel'
import { TreatmentPlanPanel } from '../components/physio/TreatmentPlanPanel'
import { today } from '../lib/utils'

export default function DepartmentHub() {
  const { code } = useParams()
  const { state } = useHospital()
  const { user } = useAuth()
  const { patientName, doctorName } = useLookups()

  const dept = getDepartment(state, code)

  const deptTasks = useMemo(
    () => (state.tasks || []).filter((t) => canSeeTask(user, t) && t.assignedDepartment === code),
    [state.tasks, user, code]
  )

  const openTasks = useMemo(
    () => [...deptTasks]
      .filter((t) => !['Completed', 'Cancelled'].includes(t.status))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [deptTasks]
  )

  const todaysAppointments = useMemo(() => {
    if (!dept) return []
    return (state.appointments || [])
      .filter((a) => a.department === dept.name && a.date === today())
      .sort((a, b) => a.time.localeCompare(b.time))
  }, [state.appointments, dept])

  const counts = useMemo(() => ({
    todaysAppointments: todaysAppointments.length,
    unclaimed: deptTasks.filter((t) => !t.acceptedBy && t.status === 'Pending').length,
    myOpen: deptTasks.filter((t) => t.acceptedBy === user.name && !['Completed', 'Cancelled'].includes(t.status)).length,
    openTotal: openTasks.length,
  }), [todaysAppointments, deptTasks, openTasks, user.name])

  if (!dept) {
    return <EmptyState title="Department not found" message={`No department with code "${code}".`} />
  }

  const Icon = departmentIcon(dept.icon)

  return (
    <>
      <PageHeader title={dept.name} subtitle={`Department hub · viewing as ${roleLabel(user.role)}`} icon={Icon} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's appointments" value={counts.todaysAppointments} icon={CalendarDays} tone="sky" />
        <StatCard label="Unclaimed tasks" value={counts.unclaimed} icon={Clock} tone="gold" />
        <StatCard label="My open tasks" value={counts.myOpen} icon={Bell} tone="sky" />
        <StatCard label="Open tasks total" value={counts.openTotal} icon={ListChecks} tone="brand" />
      </div>

      {dept.code === 'DENT' && <ProcedurePlanPanel dept={dept} />}
      {dept.code === 'PHYS' && <TreatmentPlanPanel dept={dept} />}

      <div className="mb-6 card overflow-hidden">
        <div className="border-b border-sand p-4">
          <h3 className="text-sm font-semibold text-brand-900">Department worklist</h3>
        </div>
        <TaskTable tasks={openTasks} />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-sand p-4">
          <h3 className="text-sm font-semibold text-brand-900">Today's appointments</h3>
        </div>
        {todaysAppointments.length === 0 ? (
          <EmptyState title="No appointments today" message="Nothing scheduled in this department for today." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-cream/60"><tr>
                <th className="th">Time</th><th className="th">Patient</th><th className="th">Doctor</th>
                <th className="th">Reason</th><th className="th">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-sand">
                {todaysAppointments.map((a) => (
                  <tr key={a.id} className="hover:bg-cream/40">
                    <td className="td text-ink/70">{a.time}</td>
                    <td className="td font-medium text-brand-900">{patientName(a.patientId)}</td>
                    <td className="td text-ink/60">{doctorName(a.doctorId)}</td>
                    <td className="td text-ink/60">{a.reason}</td>
                    <td className="td"><Badge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
