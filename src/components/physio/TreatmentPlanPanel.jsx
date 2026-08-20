import { useMemo, useState } from 'react'
import { ClipboardList, Plus, CalendarPlus, NotebookPen, Check } from 'lucide-react'
import { useHospital } from '../../store/HospitalContext'
import { useAuth } from '../../store/AuthContext'
import { can } from '../../config/roles'
import { useToast } from '../ui/Toast'
import { Badge, Select, Input, Textarea, EmptyState } from '../ui/primitives'
import { TASK_STATUS_TONES } from '../../config/statusTones'
import { formatDate, today, uid, inr } from '../../lib/utils'

const blankNoteDraft = () => ({ painScore: '', keyRomLabel: '', keyRomDegrees: '', notesDone: '', notesResponse: '', nextSessionFocus: '' })

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

  const packagePricing = useMemo(
    () => state.pricing.filter((p) => p.code?.startsWith('PHYS-PKG')),
    [state.pricing]
  )
  const [draft, setDraft] = useState({
    diagnosis: '', goals: '', plannedSessions: 10, frequency: '', referralId: null,
    billing: 'session', packagePriceId: packagePricing[0]?.id || '',
  })

  const startCreating = () => {
    setDraft({
      diagnosis: openReferral?.notes || '', goals: '', plannedSessions: 10, frequency: '',
      referralId: openReferral?.id || null, billing: 'session', packagePriceId: packagePricing[0]?.id || '',
    })
    setCreating(true)
  }

  // Package/session billing (§10.8) — choosing "Package" here creates the
  // package record first (so the plan can link packageId on save);
  // "Pay-per-session" leaves packageId null, and completing each session's
  // task creates a pending billableItem instead (repositories.js).
  const savePlan = () => {
    if (!draft.diagnosis.trim()) { toast('Add a diagnosis.', 'error'); return }
    const now = new Date().toISOString()
    let packageId = null
    if (draft.billing === 'package') {
      const price = packagePricing.find((p) => p.id === draft.packagePriceId)
      if (!price) { toast('Choose a package.', 'error'); return }
      const sessionsMatch = price.name.match(/^(\d+)-Session/)
      packageId = repos.packages.create({
        patientId, mrn: activePatient?.mrn || null, department: dept.name,
        pricingId: price.id, name: price.name,
        totalSessions: sessionsMatch ? Number(sessionsMatch[1]) : Number(draft.plannedSessions) || 0,
        usedSessions: 0, amount: price.amount, status: 'active',
        createdBy: user.name, createdAt: now, updatedAt: now,
      })
    }
    repos.treatmentPlans.create({
      patientId, mrn: activePatient?.mrn || null, department: dept.code,
      referralId: draft.referralId, diagnosis: draft.diagnosis.trim(), goals: draft.goals.trim(),
      plannedSessions: Number(draft.plannedSessions) || 0, frequency: draft.frequency.trim(),
      packageId, status: 'active', outcomeSummary: '',
      createdBy: user.name, createdAt: now, updatedAt: now,
    })
    toast(`Treatment plan started for ${activePatient?.name}.`)
    setCreating(false)
  }

  const setStatus = (plan, status) => {
    repos.treatmentPlans.update(plan.id, { status, updatedAt: new Date().toISOString() })
    toast(`Plan marked ${status}.`)
  }

  // Outcome tracking (§10.9) — closing a plan captures closing pain score
  // vs. the earliest progress note's pain score, goal achievement, and an
  // optional functional score, instead of just flipping status silently.
  const completeWithOutcome = (plan, outcome) => {
    const initialNote = [...(state.progressNotes || [])]
      .filter((n) => n.treatmentPlanId === plan.id)
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))[0]
    repos.treatmentPlans.update(plan.id, {
      status: 'completed', updatedAt: new Date().toISOString(),
      initialPainScore: initialNote?.painScore ?? null,
      closingPainScore: outcome.closingPainScore === '' ? null : Number(outcome.closingPainScore),
      goalAchievement: outcome.goalAchievement,
      functionalScore: outcome.functionalScore === '' ? null : Number(outcome.functionalScore),
      outcomeSummary: outcome.outcomeSummary.trim(),
    })
    toast(`${plan.diagnosis} marked completed with outcome recorded.`)
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
          <PlanCard
            key={plan.id} plan={plan} canManage={canManage}
            onSetStatus={setStatus} onCompleteWithOutcome={completeWithOutcome} onScheduleSession={scheduleSession}
          />
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
              <div>
                <span className="label">Billing</span>
                <Select value={draft.billing} onChange={(e) => setDraft({ ...draft, billing: e.target.value })}>
                  <option value="session">Pay per session</option>
                  <option value="package">Session package</option>
                </Select>
              </div>
              {draft.billing === 'package' && (
                <div>
                  <span className="label">Package</span>
                  <Select value={draft.packagePriceId} onChange={(e) => setDraft({ ...draft, packagePriceId: e.target.value })}>
                    {packagePricing.map((p) => <option key={p.id} value={p.id}>{p.name} — {inr(p.amount)}</option>)}
                  </Select>
                </div>
              )}
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

const blankOutcomeDraft = () => ({ closingPainScore: '', goalAchievement: 'met', functionalScore: '', outcomeSummary: '' })

function PlanCard({ plan, canManage, onSetStatus, onCompleteWithOutcome, onScheduleSession }) {
  const { state, repos } = useHospital()
  const { user } = useAuth()
  const toast = useToast()
  const [scheduling, setScheduling] = useState(false)
  const [sessionDraft, setSessionDraft] = useState({ date: today(), time: '10:00' })
  const [noteFor, setNoteFor] = useState(null)
  const [noteDraft, setNoteDraft] = useState(blankNoteDraft())
  const [capturingOutcome, setCapturingOutcome] = useState(false)
  const [outcomeDraft, setOutcomeDraft] = useState(blankOutcomeDraft())

  const sessions = useMemo(
    () => (state.appointments || [])
      .filter((a) => a.treatmentPlanId === plan.id)
      .map((a) => ({
        ...a,
        task: (state.tasks || []).find((t) => t.type === 'physio-session' && t.relatedId === a.id),
        note: (state.progressNotes || []).find((n) => n.appointmentId === a.id),
      }))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    [state.appointments, state.tasks, state.progressNotes, plan.id]
  )
  const completedCount = sessions.filter((s) => s.task?.status === 'Completed').length
  const pkg = plan.packageId ? (state.packages || []).find((p) => p.id === plan.packageId) : null

  const submitSchedule = () => {
    if (!sessionDraft.date || !sessionDraft.time) { toast('Pick a date and time.', 'error'); return }
    onScheduleSession(plan, sessionDraft.date, sessionDraft.time)
    setScheduling(false)
  }

  // Per-session SOAP-lite note (§10.7) — re-captures painScore (+ optional
  // key ROM) so the patient's physio tab can render a trend from it.
  const openNoteFor = (session) => { setNoteDraft(blankNoteDraft()); setNoteFor(session.id) }

  const submitNote = (session) => {
    if (noteDraft.painScore === '') { toast('Enter a pain score.', 'error'); return }
    repos.progressNotes.create({
      patientId: plan.patientId, mrn: plan.mrn, treatmentPlanId: plan.id,
      appointmentId: session.id, taskId: session.task?.id || null,
      painScore: Number(noteDraft.painScore),
      keyRomLabel: noteDraft.keyRomLabel.trim() || null,
      keyRomDegrees: noteDraft.keyRomDegrees === '' ? null : Number(noteDraft.keyRomDegrees),
      notesDone: noteDraft.notesDone.trim(), notesResponse: noteDraft.notesResponse.trim(),
      nextSessionFocus: noteDraft.nextSessionFocus.trim(),
      writtenBy: user.name, createdAt: new Date().toISOString(),
    })
    toast('Progress note saved.')
    setNoteFor(null)
  }

  // Picking "completed" opens the outcome form instead of committing
  // immediately; active/discontinued still apply straight away. The
  // <Select> keeps showing plan.status, so cancelling just leaves it
  // untouched — no extra state needed to "revert" it.
  const handleStatusChange = (newStatus) => {
    if (newStatus === 'completed' && plan.status !== 'completed') {
      setOutcomeDraft(blankOutcomeDraft())
      setCapturingOutcome(true)
    } else {
      onSetStatus(plan, newStatus)
    }
  }

  const submitOutcome = () => {
    onCompleteWithOutcome(plan, outcomeDraft)
    setCapturingOutcome(false)
  }

  return (
    <div className="rounded-lg border border-sand">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sand bg-cream/40 px-3 py-2">
        <div>
          <p className="text-sm font-medium text-brand-900">{plan.diagnosis}</p>
          <p className="text-xs text-ink/50">{plan.goals}</p>
        </div>
        {canManage ? (
          <Select value={plan.status} onChange={(e) => handleStatusChange(e.target.value)} className="w-auto py-1 text-xs">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </Select>
        ) : (
          <Badge status={plan.status} />
        )}
      </div>

      {plan.status === 'completed' && (plan.closingPainScore != null || plan.goalAchievement) && (
        <div className="border-b border-sand bg-brand-50/40 px-3 py-2 text-xs text-brand-800">
          Outcome: pain {plan.initialPainScore ?? '—'} → {plan.closingPainScore ?? '—'}
          {plan.goalAchievement && <> · Goals {plan.goalAchievement.replace('-', ' ')}</>}
          {plan.functionalScore != null && <> · Functional score {plan.functionalScore}</>}
          {plan.outcomeSummary && <> · {plan.outcomeSummary}</>}
        </div>
      )}

      {capturingOutcome && (
        <div className="space-y-2 border-b border-sand bg-cream/60 p-3">
          <p className="text-xs font-medium text-brand-900">Recording outcome for this plan</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Input type="number" min="0" max="10" placeholder="Closing pain 0–10" value={outcomeDraft.closingPainScore} onChange={(e) => setOutcomeDraft({ ...outcomeDraft, closingPainScore: e.target.value })} />
            <Select value={outcomeDraft.goalAchievement} onChange={(e) => setOutcomeDraft({ ...outcomeDraft, goalAchievement: e.target.value })}>
              <option value="met">Goals met</option>
              <option value="partial">Goals partially met</option>
              <option value="not-met">Goals not met</option>
            </Select>
            <Input type="number" placeholder="Functional score (optional)" value={outcomeDraft.functionalScore} onChange={(e) => setOutcomeDraft({ ...outcomeDraft, functionalScore: e.target.value })} className="sm:col-span-2" />
          </div>
          <Textarea placeholder="Outcome summary…" value={outcomeDraft.outcomeSummary} onChange={(e) => setOutcomeDraft({ ...outcomeDraft, outcomeSummary: e.target.value })} />
          <div className="flex gap-2">
            <button className="btn-primary btn-sm" onClick={submitOutcome}>Complete Plan</button>
            <button className="btn-outline btn-sm" onClick={() => setCapturingOutcome(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-3 py-2 text-xs text-ink/60">
        <span>{completedCount} of {plan.plannedSessions} sessions completed</span>
        {plan.frequency && <span>{plan.frequency}</span>}
        <span>Started {formatDate(plan.createdAt)} by {plan.createdBy}</span>
        {pkg ? (
          <span className="flex items-center gap-1.5">
            <Badge tone={pkg.status === 'exhausted' ? 'rose' : 'green'}>{pkg.name}</Badge>
            {Math.min(pkg.usedSessions, pkg.totalSessions)} of {pkg.totalSessions} sessions used
          </span>
        ) : (
          <Badge tone="slate">Pay per session</Badge>
        )}
      </div>

      {sessions.length > 0 && (
        <ul className="divide-y divide-sand border-t border-sand">
          {sessions.map((s) => (
            <li key={s.id} className="px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink/70">{formatDate(s.date)} · {s.time}</span>
                <div className="flex items-center gap-2">
                  <Badge tone={TASK_STATUS_TONES[s.task?.status] || 'gold'}>{s.task?.status || 'Pending'}</Badge>
                  {canManage && s.task?.status === 'Completed' && (
                    s.note ? (
                      <span className="flex items-center gap-1 text-xs text-brand-700"><Check size={13} /> Noted</span>
                    ) : (
                      <button className="btn-ghost btn-sm" onClick={() => openNoteFor(s)}><NotebookPen size={13} /> Add note</button>
                    )
                  )}
                </div>
              </div>

              {noteFor === s.id && (
                <div className="mt-2 space-y-2 rounded-lg bg-cream/60 p-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Input type="number" min="0" max="10" placeholder="Pain 0–10" value={noteDraft.painScore} onChange={(e) => setNoteDraft({ ...noteDraft, painScore: e.target.value })} />
                    <Input placeholder="Key ROM (optional)" value={noteDraft.keyRomLabel} onChange={(e) => setNoteDraft({ ...noteDraft, keyRomLabel: e.target.value })} />
                    <Input type="number" placeholder="Degrees" value={noteDraft.keyRomDegrees} onChange={(e) => setNoteDraft({ ...noteDraft, keyRomDegrees: e.target.value })} />
                  </div>
                  <Textarea placeholder="What was done…" value={noteDraft.notesDone} onChange={(e) => setNoteDraft({ ...noteDraft, notesDone: e.target.value })} />
                  <Textarea placeholder="Patient response…" value={noteDraft.notesResponse} onChange={(e) => setNoteDraft({ ...noteDraft, notesResponse: e.target.value })} />
                  <Textarea placeholder="Next session focus…" value={noteDraft.nextSessionFocus} onChange={(e) => setNoteDraft({ ...noteDraft, nextSessionFocus: e.target.value })} />
                  <div className="flex gap-2">
                    <button className="btn-primary btn-sm" onClick={() => submitNote(s)}>Save note</button>
                    <button className="btn-outline btn-sm" onClick={() => setNoteFor(null)}>Cancel</button>
                  </div>
                </div>
              )}
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
