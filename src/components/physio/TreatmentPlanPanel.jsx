import { useMemo, useState } from 'react'
import { ClipboardList, Plus, CalendarPlus } from 'lucide-react'
import { useHospital } from '../../store/HospitalContext'
import { useAuth } from '../../store/AuthContext'
import { can } from '../../config/roles'
import { useToast } from '../ui/Toast'
import { Badge, Select, Input, Textarea, EmptyState } from '../ui/primitives'
import { TASK_STATUS_TONES } from '../../config/statusTones'
import { formatDate, today, uid } from '../../lib/utils'

const STATUS_OPTIONS = ['active', 'completed', 'discontinued']

// Physiotherapy-only enhancement of the generic Department Hub (§10.6),
// mirroring the shape of Dental's ProcedurePlanPanel (Phase 5b) — one
// patient picker, plan cards below. Session scheduling (§10.4) creates a
// linked appointment + a companion task; the task's own lifecycle status
// (not the appointment's own status field) is what the plan card shows
// per session, since Accept/Start/Complete on the task IS the session's
// real progress — avoids teaching the generic task-complete verb about a
// physio-specific side effect just to keep two status fields in sync.
export function TreatmentPlanPanel({ dept }) {
  const { state, repos, add, createTask } = useHospital()
  const { user } = useAuth()
  const toast = useToast()

  const canManage = can(user, 'consultations.create')
  const deptPatients = useMemo(
    () => state.patients.filter((p) => p.department === dept.name),
    [state.patients, dept.name]
  )
  const [patientId, setPatientId] = useState(deptPatients[0]?.id || '')
  const [creating, setCreating] = useState(false)

  const activePatient = deptPatients.find((p) => p.id === patientId)

  const plans = useMemo(
    () => (state.treatmentPlans || [])
      .filter((p) => p.patientId === patientId)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [state.treatmentPlans, patientId]
  )

  // A still-open physio-referral task for this patient not yet linked to
  // any plan — offered as a one-click prefill when starting a new plan.
  const openReferral = useMemo(() => {
    const linkedIds = new Set((state.treatmentPlans || []).map((p) => p.referralId).filter(Boolean))
    return (state.tasks || []).find((t) =>
      t.type === 'physio-referral' && t.mrn === activePatient?.mrn &&
      !linkedIds.has(t.id) && !['Completed', 'Cancelled'].includes(t.status)
    )
  }, [state.tasks, state.treatmentPlans, activePatient])

  const [draft, setDraft] = useState({ diagnosis: '', goals: '', plannedSessions: 10, frequency: '', referralId: null })

  const startCreating = () => {
    setDraft({
      diagnosis: openReferral?.notes || '', goals: '', plannedSessions: 10,
      frequency: '', referralId: openReferral?.id || null,
    })
    setCreating(true)
  }

  const savePlan = () => {
    if (!draft.diagnosis.trim()) { toast('Add a diagnosis.', 'error'); return }
    const now = new Date().toISOString()
    repos.treatmentPlans.create({
      patientId, mrn: activePatient?.mrn || null, department: dept.code,
      referralId: draft.referralId, diagnosis: draft.diagnosis.trim(), goals: draft.goals.trim(),
      plannedSessions: Number(draft.plannedSessions) || 0, frequency: draft.frequency.trim(),
      packageId: null, status: 'active', outcomeSummary: '',
      createdBy: user.name, createdAt: now, updatedAt: now,
    })
    toast(`Treatment plan started for ${activePatient?.name}.`)
    setCreating(false)
  }

  const setStatus = (plan, status) => {
    repos.treatmentPlans.update(plan.id, { status, updatedAt: new Date().toISOString() })
    toast(`Plan marked ${status}.`)
  }

  const scheduleSession = (plan, date, time) => {
    const apptId = uid('apt')
    add('appointments', {
      id: apptId, patientId: plan.patientId, doctorId: user.id, department: dept.name,
      date, time, reason: 'Session', status: 'scheduled', treatmentPlanId: plan.id,
    })
    createTask({
      type: 'physio-session', mrn: plan.mrn, sourceRole: user.role, createdBy: user.name,
      relatedId: apptId, notes: `Session for ${plan.diagnosis}`,
    })
    toast(`Session scheduled for ${formatDate(date)}.`)
  }

  if (deptPatients.length === 0) return null

  return (
    <div className="mb-6 card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-900">
          <ClipboardList size={16} /> Treatment Plans
        </h3>
        <Select value={patientId} onChange={(e) => { setPatientId(e.target.value); setCreating(false) }} className="w-auto py-1.5 text-sm">
          {deptPatients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      <div className="space-y-4 p-4">
        {plans.length === 0 && !creating && (
          <EmptyState
            title="No treatment plan yet"
            message={
              canManage
                ? openReferral
                  ? `Open referral from ${openReferral.createdBy} — start a plan for ${activePatient?.name}.`
                  : `Start a treatment plan for ${activePatient?.name}.`
                : 'No treatment plan on record for this patient.'
            }
            action={canManage && <button className="btn-primary btn-sm" onClick={startCreating}><Plus size={14} /> Start Treatment Plan</button>}
          />
        )}

        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} canManage={canManage} onSetStatus={setStatus} onScheduleSession={scheduleSession} />
        ))}

        {plans.length > 0 && canManage && !creating && (
          <button className="btn-ghost btn-sm" onClick={startCreating}><Plus size={14} /> Start another plan</button>
        )}

        {creating && (
          <div className="space-y-3 rounded-lg border border-sand p-3">
            {openReferral && draft.referralId && (
              <p className="text-xs text-gold-700">Prefilled from {openReferral.createdBy}'s referral — edit as needed.</p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <span className="label">Diagnosis</span>
                <Textarea value={draft.diagnosis} onChange={(e) => setDraft({ ...draft, diagnosis: e.target.value })} placeholder="e.g. Hemiparesis, recovering — post-stroke" />
              </div>
              <div className="sm:col-span-2">
                <span className="label">Goals</span>
                <Textarea value={draft.goals} onChange={(e) => setDraft({ ...draft, goals: e.target.value })} placeholder="e.g. Independent ambulation without assistive device" />
              </div>
              <div>
                <span className="label">Planned sessions</span>
                <Input type="number" min="1" value={draft.plannedSessions} onChange={(e) => setDraft({ ...draft, plannedSessions: e.target.value })} />
              </div>
              <div>
                <span className="label">Frequency</span>
                <Input value={draft.frequency} onChange={(e) => setDraft({ ...draft, frequency: e.target.value })} placeholder="e.g. 3x/week for 4 weeks" />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary btn-sm" onClick={savePlan}>Start Plan</button>
              <button className="btn-outline btn-sm" onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PlanCard({ plan, canManage, onSetStatus, onScheduleSession }) {
  const { state } = useHospital()
  const toast = useToast()
  const [scheduling, setScheduling] = useState(false)
  const [sessionDraft, setSessionDraft] = useState({ date: today(), time: '10:00' })

  const sessions = useMemo(
    () => (state.appointments || [])
      .filter((a) => a.treatmentPlanId === plan.id)
      .map((a) => ({ ...a, task: (state.tasks || []).find((t) => t.type === 'physio-session' && t.relatedId === a.id) }))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    [state.appointments, state.tasks, plan.id]
  )
  const completedCount = sessions.filter((s) => s.task?.status === 'Completed').length

  const submitSchedule = () => {
    if (!sessionDraft.date || !sessionDraft.time) { toast('Pick a date and time.', 'error'); return }
    onScheduleSession(plan, sessionDraft.date, sessionDraft.time)
    setScheduling(false)
  }

  return (
    <div className="rounded-lg border border-sand">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sand bg-cream/40 px-3 py-2">
        <div>
          <p className="text-sm font-medium text-brand-900">{plan.diagnosis}</p>
          <p className="text-xs text-ink/50">{plan.goals}</p>
        </div>
        {canManage ? (
          <Select value={plan.status} onChange={(e) => onSetStatus(plan, e.target.value)} className="w-auto py-1 text-xs">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </Select>
        ) : (
          <Badge status={plan.status} />
        )}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 px-3 py-2 text-xs text-ink/60">
        <span>{completedCount} of {plan.plannedSessions} sessions completed</span>
        {plan.frequency && <span>{plan.frequency}</span>}
        <span>Started {formatDate(plan.createdAt)} by {plan.createdBy}</span>
      </div>

      {sessions.length > 0 && (
        <ul className="divide-y divide-sand border-t border-sand">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="text-ink/70">{formatDate(s.date)} · {s.time}</span>
              <Badge tone={TASK_STATUS_TONES[s.task?.status] || 'gold'}>{s.task?.status || 'Pending'}</Badge>
            </li>
          ))}
        </ul>
      )}

      {canManage && plan.status === 'active' && (
        scheduling ? (
          <div className="flex flex-wrap items-end gap-2 border-t border-sand p-3">
            <Input type="date" value={sessionDraft.date} onChange={(e) => setSessionDraft({ ...sessionDraft, date: e.target.value })} className="w-auto" />
            <Input type="time" value={sessionDraft.time} onChange={(e) => setSessionDraft({ ...sessionDraft, time: e.target.value })} className="w-auto" />
            <button className="btn-primary btn-sm" onClick={submitSchedule}>Schedule</button>
            <button className="btn-outline btn-sm" onClick={() => setScheduling(false)}>Cancel</button>
          </div>
        ) : (
          <div className="border-t border-sand p-2">
            <button className="btn-ghost btn-sm" onClick={() => setScheduling(true)}><CalendarPlus size={14} /> Schedule session</button>
          </div>
        )
      )}
    </div>
  )
}
