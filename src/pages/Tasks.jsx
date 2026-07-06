import { useMemo, useState } from 'react'
import { Bell, CheckCircle2, Clock, AlertTriangle, Filter } from 'lucide-react'
import { useHospital, useLookups } from '../store/HospitalContext'
import { useAuth } from '../store/AuthContext'
import { can, roleLabel } from '../config/roles'
import { useToast } from '../components/ui/Toast'
import { PageHeader, StatCard, Badge, Select, EmptyState } from '../components/ui/primitives'
import { TASK_STATUS, TASK_PRIORITY } from '../services/workflow'
import { formatDate } from '../lib/utils'

const PRIORITY_TONE = { Low: 'slate', Normal: 'sky', High: 'gold', Critical: 'rose' }
const STATUS_TONE = { Pending: 'gold', 'In Progress': 'sky', Completed: 'green', Cancelled: 'slate' }

export default function Tasks() {
  const { state, update, logAudit } = useHospital()
  const { user } = useAuth()
  const toast = useToast()
  const [scope, setScope] = useState('mine') // mine | all
  const [status, setStatus] = useState('open')

  const isManager = ['admin', 'management'].includes(user.role)
  const canUpdate = can(user, 'tasks.update')

  const tasks = useMemo(() => {
    let list = state.tasks || []
    if (scope === 'mine') list = list.filter((t) => t.assignedRole === user.role || (user.role === 'admin'))
    if (status === 'open') list = list.filter((t) => t.status === 'Pending' || t.status === 'In Progress')
    else if (status !== 'all') list = list.filter((t) => t.status === status)
    return [...list].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  }, [state.tasks, scope, status, user.role])

  const counts = useMemo(() => {
    const mine = (state.tasks || []).filter((t) => t.assignedRole === user.role || user.role === 'admin')
    return {
      open: mine.filter((t) => t.status === 'Pending').length,
      inProgress: mine.filter((t) => t.status === 'In Progress').length,
      critical: mine.filter((t) => t.priority === 'Critical' && t.status !== 'Completed').length,
    }
  }, [state.tasks, user.role])

  const setStatusFor = (task, newStatus) => {
    update('tasks', task.id, { status: newStatus, updatedAt: new Date().toISOString() })
    logAudit({ user, action: 'task.status.changed', module: 'tasks', recordId: task.id, mrn: task.mrn, oldValue: task.status, newValue: newStatus })
    toast(`Task marked ${newStatus}.`)
  }

  return (
    <>
      <PageHeader title="Tasks & Alerts" subtitle={`Connected work queue · viewing as ${roleLabel(user.role)}`} icon={Bell} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Pending (yours)" value={counts.open} icon={Clock} tone="gold" />
        <StatCard label="In Progress" value={counts.inProgress} icon={Bell} tone="sky" />
        <StatCard label="Critical Open" value={counts.critical} icon={AlertTriangle} tone="rose" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-sand p-4">
          <Filter size={16} className="text-ink/30" />
          <Select value={scope} onChange={(e) => setScope(e.target.value)} className="w-auto">
            <option value="mine">My department</option>
            <option value="all">All departments</option>
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
            <option value="open">Open</option>
            <option value="all">All</option>
            {TASK_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>

        {tasks.length === 0 ? (
          <EmptyState title="No tasks" message="Nothing in this queue right now." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="bg-cream/60"><tr>
                <th className="th">Task</th><th className="th">Priority</th><th className="th">MRN</th>
                <th className="th">From → To</th><th className="th">Created</th><th className="th">Status</th><th className="th text-right">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-sand">
                {tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-cream/40">
                    <td className="td">
                      <p className="font-medium text-brand-900">{t.label}</p>
                      {t.notes && <p className="text-xs text-ink/40 max-w-[280px] truncate">{t.notes}</p>}
                    </td>
                    <td className="td"><Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge></td>
                    <td className="td font-mono text-xs text-ink/60">{t.mrn || '—'}</td>
                    <td className="td text-xs text-ink/50">{roleLabel(t.sourceRole)} → {roleLabel(t.assignedRole)}</td>
                    <td className="td text-ink/50">{formatDate(t.createdAt)}</td>
                    <td className="td"><Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge></td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        {canUpdate && t.status === 'Pending' && <button className="btn-ghost btn-sm" onClick={() => setStatusFor(t, 'In Progress')}>Start</button>}
                        {canUpdate && t.status !== 'Completed' && t.status !== 'Cancelled' && <button className="btn-ghost btn-sm text-brand-700" onClick={() => setStatusFor(t, 'Completed')}><CheckCircle2 size={15} /></button>}
                      </div>
                    </td>
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
