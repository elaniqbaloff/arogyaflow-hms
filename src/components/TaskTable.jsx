import { useState } from 'react'
import { CheckCircle2, Repeat } from 'lucide-react'
import { useHospital } from '../store/HospitalContext'
import { useAuth } from '../store/AuthContext'
import { roleLabel } from '../config/roles'
import { ROLE_DEPARTMENT } from '../services/workflow'
import { canActOnTask } from '../services/taskPolicy'
import { useToast } from './ui/Toast'
import { Modal } from './ui/Modal'
import { Badge, Select, Field, Textarea, EmptyState } from './ui/primitives'
import { TASK_STATUS_TONES, TASK_PRIORITY_TONES } from '../config/statusTones'
import { formatDate } from '../lib/utils'

// Roles tasks actually route to — the ones a reassign can target.
const ROUTABLE_ROLES = ['lab', 'pharmacy', 'finance', 'reception', 'doctor', 'nurse']

const formatDateTime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${formatDate(iso)} · ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
}

// Shared task worklist: table + row actions (accept/start/release/complete/
// block/unblock/reassign) + their modals. Used by Tasks.jsx (the full
// cross-department queue) and DepartmentHub.jsx (one department's worklist)
// — callers pass in whatever already-filtered, already-sorted task list they
// want rendered; this component owns nothing about scope, only display+action.
export function TaskTable({ tasks }) {
  const { state, repos } = useHospital()
  const { user } = useAuth()
  const toast = useToast()
  const [blocking, setBlocking] = useState(null)
  const [reassigning, setReassigning] = useState(null)

  const run = (result, okMessage) => {
    if (result.ok) toast(okMessage)
    else toast(result.reason === 'already-accepted' ? 'Someone already accepted this task.' : 'That action could not be completed.', 'error')
  }

  const handleAccept = (t) => run(repos.tasks.accept(t.id, user), 'Task accepted.')
  const handleStart = (t) => run(repos.tasks.start(t.id, user), 'Task started.')
  const handleComplete = (t) => run(repos.tasks.complete(t.id, user), 'Task marked complete.')
  const handleRelease = (t) => run(repos.tasks.release(t.id, user), 'Task released back to the queue.')
  const handleUnblock = (t) => run(repos.tasks.unblock(t.id, user), 'Task unblocked.')
  const submitBlock = (reason) => {
    run(repos.tasks.block(blocking.id, user, reason), 'Task blocked.')
    setBlocking(null)
  }
  const submitReassign = (spec) => {
    run(repos.tasks.reassign(reassigning.id, user, spec), 'Task reassigned.')
    setReassigning(null)
  }

  if (tasks.length === 0) {
    return <EmptyState title="No tasks" message="Nothing in this queue right now." />
  }

  return (
    <>
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
                  {t.acceptedBy && (
                    <p className="text-[11px] text-ink/40 mt-0.5">Accepted by {t.acceptedBy} · {formatDateTime(t.acceptedAt)}</p>
                  )}
                  {t.status === 'Blocked' && t.blockedReason && (
                    <p className="text-[11px] text-rose-600 mt-0.5">Blocked: {t.blockedReason}</p>
                  )}
                </td>
                <td className="td"><Badge tone={TASK_PRIORITY_TONES[t.priority]}>{t.priority}</Badge></td>
                <td className="td font-mono text-xs text-ink/60">{t.mrn || '—'}</td>
                <td className="td text-xs text-ink/50">{roleLabel(t.sourceRole)} → {roleLabel(t.assignedRole)}</td>
                <td className="td text-ink/50">{formatDate(t.createdAt)}</td>
                <td className="td"><Badge tone={TASK_STATUS_TONES[t.status]}>{t.status}</Badge></td>
                <td className="td">
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    {t.status === 'Pending' && canActOnTask(user, t, 'accept') && (
                      <button className="btn-ghost btn-sm" onClick={() => handleAccept(t)}>Accept</button>
                    )}
                    {t.status === 'Accepted' && canActOnTask(user, t, 'start') && (
                      <button className="btn-ghost btn-sm" onClick={() => handleStart(t)}>Start</button>
                    )}
                    {t.status === 'Accepted' && canActOnTask(user, t, 'release') && (
                      <button className="btn-ghost btn-sm text-ink/50" onClick={() => handleRelease(t)}>Release</button>
                    )}
                    {t.status === 'In Progress' && canActOnTask(user, t, 'complete') && (
                      <button className="btn-ghost btn-sm text-brand-700" title="Complete" onClick={() => handleComplete(t)}><CheckCircle2 size={15} /></button>
                    )}
                    {t.status === 'In Progress' && canActOnTask(user, t, 'block') && (
                      <button className="btn-ghost btn-sm text-rose-600" onClick={() => setBlocking(t)}>Block</button>
                    )}
                    {t.status === 'Blocked' && canActOnTask(user, t, 'unblock') && (
                      <button className="btn-ghost btn-sm" onClick={() => handleUnblock(t)}>Unblock</button>
                    )}
                    {!['Completed', 'Cancelled'].includes(t.status) && canActOnTask(user, t, 'reassign') && (
                      <button className="btn-ghost btn-sm text-ink/50" title="Reassign" onClick={() => setReassigning(t)}><Repeat size={15} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {blocking && <BlockModal task={blocking} onClose={() => setBlocking(null)} onSubmit={submitBlock} />}
      {reassigning && <ReassignModal task={reassigning} state={state} onClose={() => setReassigning(null)} onSubmit={submitReassign} />}
    </>
  )
}

function BlockModal({ task, onClose, onSubmit }) {
  const [reason, setReason] = useState('')
  return (
    <Modal open onClose={onClose} title="Block task" subtitle={task.label}
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn-danger" disabled={!reason.trim()} onClick={() => onSubmit(reason.trim())}>Block</button></>}>
      <Field label="Reason (recorded in audit log)" required>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this task blocked?" />
      </Field>
    </Modal>
  )
}

function ReassignModal({ task, state, onClose, onSubmit }) {
  const [role, setRole] = useState(task.assignedRole)
  const [userId, setUserId] = useState('')

  const candidates = (state.users || []).filter((u) => u.role === role && u.status !== 'disabled')

  return (
    <Modal open onClose={onClose} title="Reassign task" subtitle={task.label}
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => onSubmit({ role, department: ROLE_DEPARTMENT[role], userId: userId || null })}>Reassign</button></>}>
      <div className="space-y-4">
        <Field label="Department / role">
          <Select value={role} onChange={(e) => { setRole(e.target.value); setUserId('') }}>
            {ROUTABLE_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
          </Select>
        </Field>
        <Field label="Specific person (optional)" hint="Leave unset to reopen it for the whole department to claim.">
          <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Any — open to department</option>
            {candidates.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  )
}
