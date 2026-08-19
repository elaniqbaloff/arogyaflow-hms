import { useMemo, useState } from 'react'
import { Bell, Clock, AlertTriangle, OctagonAlert, Filter } from 'lucide-react'
import { useHospital } from '../store/HospitalContext'
import { useAuth } from '../store/AuthContext'
import { roleLabel } from '../config/roles'
import { ROLE_DEPARTMENT } from '../services/workflow'
import { canSeeTask } from '../services/taskPolicy'
import { PageHeader, StatCard, Select } from '../components/ui/primitives'
import { TaskTable } from '../components/TaskTable'

export default function Tasks() {
  const { state } = useHospital()
  const { user } = useAuth()
  const [scope, setScope] = useState('queue') // queue | department | all
  const [status, setStatus] = useState('open')

  const isManager = user.role === 'admin' || user.role === 'management'
  const myDept = ROLE_DEPARTMENT[user.role] || null

  const visible = useMemo(
    () => (state.tasks || []).filter((t) => canSeeTask(user, t)),
    [state.tasks, user]
  )

  const scoped = useMemo(() => {
    if (scope === 'all') return visible
    if (scope === 'department') return visible.filter((t) => t.assignedDepartment === myDept)
    // queue: tasks I've accepted, plus unclaimed tasks in my department
    return visible.filter((t) => t.acceptedBy === user.name || (!t.acceptedBy && t.assignedDepartment === myDept))
  }, [visible, scope, myDept, user.name])

  const tasks = useMemo(() => {
    let list = scoped
    if (status === 'open') list = list.filter((t) => !['Completed', 'Cancelled'].includes(t.status))
    else if (status !== 'all') list = list.filter((t) => t.status === status)
    return [...list].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  }, [scoped, status])

  const counts = useMemo(() => {
    const mineOwned = visible.filter((t) => t.acceptedBy === user.name)
    return {
      unclaimed: visible.filter((t) => !t.acceptedBy && t.assignedDepartment === myDept && t.status === 'Pending').length,
      inProgress: mineOwned.filter((t) => t.status === 'In Progress').length,
      critical: visible.filter((t) => t.priority === 'Critical' && !['Completed', 'Cancelled'].includes(t.status)).length,
      blocked: visible.filter((t) => t.status === 'Blocked').length,
    }
  }, [visible, myDept, user.name])

  return (
    <>
      <PageHeader title="Tasks & Alerts" subtitle={`Connected work queue · viewing as ${roleLabel(user.role)}`} icon={Bell} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Unclaimed (my dept)" value={counts.unclaimed} icon={Clock} tone="gold" />
        <StatCard label="Mine in progress" value={counts.inProgress} icon={Bell} tone="sky" />
        <StatCard label="Critical open" value={counts.critical} icon={AlertTriangle} tone="rose" />
        <StatCard label="Blocked" value={counts.blocked} icon={OctagonAlert} tone="rose" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-sand p-4">
          <Filter size={16} className="text-ink/30" />
          <div className="flex flex-wrap gap-1">
            {[
              { key: 'queue', label: 'My queue' },
              { key: 'department', label: 'My department' },
              ...(isManager ? [{ key: 'all', label: 'All departments' }] : []),
            ].map((tab) => (
              <button key={tab.key} onClick={() => setScope(tab.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${scope === tab.key ? 'bg-white text-brand-800 shadow-sm' : 'text-ink/50 hover:text-ink/80'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto ml-auto">
            <option value="open">Open</option>
            <option value="all">All</option>
            <option value="Pending">Pending</option>
            <option value="Accepted">Accepted</option>
            <option value="In Progress">In Progress</option>
            <option value="Blocked">Blocked</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </Select>
        </div>

        <TaskTable tasks={tasks} />
      </div>
    </>
  )
}
