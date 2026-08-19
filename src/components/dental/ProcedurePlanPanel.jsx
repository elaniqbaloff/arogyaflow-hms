import { useMemo, useState } from 'react'
import { ClipboardPlus, Plus, Check, Play, X, FileSignature, FileImage, Sparkles } from 'lucide-react'
import { useHospital } from '../../store/HospitalContext'
import { useAuth } from '../../store/AuthContext'
import { can } from '../../config/roles'
import { useToast } from '../ui/Toast'
import { Badge, Select, Input, EmptyState } from '../ui/primitives'
import { SmartField } from '../ui/SmartField'
import { ALL_FDI_TEETH } from '../ui/ToothPicker'
import { inr, uid, formatDate, today } from '../../lib/utils'
import { printConsentForm } from '../../lib/printDocument'
import { ORDER_SETS } from '../../data/orderSets'

const ATTACHMENT_TYPES = [
  { value: 'xray', label: 'X-ray' },
  { value: 'photo', label: 'Clinical photo' },
  { value: 'document', label: 'Document' },
]

// Which action(s) a plan item's current status allows, per the lock-safe
// state machine in repositories.js (proposed → accepted → in-progress →
// completed, cancellable up to in-progress).
const ITEM_ACTIONS = {
  proposed: [{ verb: 'acceptItem', label: 'Accept', icon: Check }],
  accepted: [{ verb: 'startItem', label: 'Start', icon: Play }],
  'in-progress': [{ verb: 'completeItem', label: 'Complete', icon: Check }],
}
const VERB_LABELS = { acceptItem: 'accepted', startItem: 'started', completeItem: 'completed', cancelItem: 'cancelled' }

// Dental-only enhancement of the generic Department Hub (§9.10) — a phased
// treatment plan per patient, with lock-safe item verbs backed by
// repos.procedurePlans (repositories.js).
export function ProcedurePlanPanel({ dept }) {
  const { state, repos } = useHospital()
  const { user } = useAuth()
  const toast = useToast()

  const canManage = can(user, 'consultations.create')
  const deptPatients = useMemo(
    () => state.patients.filter((p) => p.department === dept.name),
    [state.patients, dept.name]
  )
  const [patientId, setPatientId] = useState(deptPatients[0]?.id || '')
  const [addingFor, setAddingFor] = useState(null)
  const [orderSetFor, setOrderSetFor] = useState(null)

  // Read the render list straight from context state, not through
  // repos.procedurePlans — repos reads via a ref that HospitalContext only
  // syncs after commit, so deriving rendered UI from it lags one render
  // cycle behind a just-dispatched change. repos.* verbs stay the right
  // tool for the mutations themselves (see doVerb/saveItem below).
  const plans = useMemo(
    () => (state.procedurePlans || [])
      .filter((p) => p.patientId === patientId)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [state.procedurePlans, patientId]
  )

  const dentalPricing = useMemo(() => state.pricing.filter((p) => p.department === 'Dental'), [state.pricing])
  const activePatient = deptPatients.find((p) => p.id === patientId)

  const startPlan = () => {
    if (!patientId) return
    const now = new Date().toISOString()
    const id = repos.procedurePlans.create({
      patientId, mrn: activePatient?.mrn || null, department: dept.code, items: [],
      consentStatus: 'pending', createdBy: user.name, createdAt: now, updatedAt: now,
    })
    toast(`Procedure plan started for ${activePatient?.name}.`)
    setAddingFor(id)
  }

  const doVerb = (verb, planId, itemId) => {
    const result = repos.procedurePlans[verb](planId, itemId, user)
    if (!result.ok) { toast(`Couldn't update item (${result.reason}).`, 'error'); return }
    toast(`Item ${VERB_LABELS[verb] || 'updated'}.`)
  }

  const signConsent = (planId) => {
    const result = repos.procedurePlans.signConsent(planId, user)
    if (!result.ok) { toast(`Couldn't record consent (${result.reason}).`, 'error'); return }
    toast('Consent recorded as signed.')
  }

  const applyOrderSet = (planId, orderSetKey, tooth, consultationId) => {
    const result = repos.procedurePlans.applyOrderSet(planId, orderSetKey, { tooth, consultationId }, user)
    if (!result.ok) { toast(`Couldn't apply order set (${result.reason}).`, 'error'); return }
    toast(`${ORDER_SETS[orderSetKey]?.label || 'Order set'} applied — review and accept each item.`)
    setOrderSetFor(null)
  }

  if (deptPatients.length === 0) return null

  return (
    <>
      <div className="mb-6 card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-900">
            <ClipboardPlus size={16} /> Procedure Plans
          </h3>
          <Select value={patientId} onChange={(e) => { setPatientId(e.target.value); setAddingFor(null) }} className="w-auto py-1.5 text-sm">
            {deptPatients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>

        <div className="space-y-4 p-4">
          {plans.length === 0 ? (
            <EmptyState
              title="No procedure plan yet"
              message={canManage ? `Start a phased treatment plan for ${activePatient?.name}.` : 'No treatment plan on record for this patient.'}
              action={canManage && (
                <button className="btn-primary btn-sm" onClick={startPlan}><Plus size={14} /> Start Procedure Plan</button>
              )}
            />
          ) : (
            plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                patientId={patientId}
                canManage={canManage}
                dentalPricing={dentalPricing}
                adding={addingFor === plan.id}
                onAddItem={() => { setAddingFor(plan.id); setOrderSetFor(null) }}
                onCancelAdd={() => setAddingFor(null)}
                onDoVerb={doVerb}
                onSignConsent={signConsent}
                orderSetOpen={orderSetFor === plan.id}
                onToggleOrderSet={() => { setOrderSetFor(orderSetFor === plan.id ? null : plan.id); setAddingFor(null) }}
                onApplyOrderSet={applyOrderSet}
              />
            ))
          )}
        </div>
      </div>

      {activePatient && <AttachmentsSection patient={activePatient} canManage={canManage} />}
    </>
  )
}

function AttachmentsSection({ patient, canManage }) {
  const { state, repos } = useHospital()
  const { user } = useAuth()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ type: 'xray', label: '', externalRef: '', takenAt: today() })

  const attachments = useMemo(
    () => (state.attachments || [])
      .filter((a) => a.patientId === patient.id)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [state.attachments, patient.id]
  )

  const save = () => {
    if (!draft.label.trim()) { toast('Add a label for this record.', 'error'); return }
    repos.attachments.create({
      patientId: patient.id, mrn: patient.mrn, type: draft.type, label: draft.label.trim(),
      externalRef: draft.externalRef.trim(), takenAt: draft.takenAt,
      uploadedBy: user.name, createdAt: new Date().toISOString(),
    })
    toast('Attachment reference added.')
    setDraft({ type: 'xray', label: '', externalRef: '', takenAt: today() })
    setAdding(false)
  }

  return (
    <div className="mb-6 card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-900">
          <FileImage size={16} /> Imaging & Documents — {patient.name}
        </h3>
        {canManage && !adding && (
          <button className="btn-ghost btn-sm" onClick={() => setAdding(true)}><Plus size={14} /> Add reference</button>
        )}
      </div>
      <p className="border-b border-sand bg-cream/40 px-4 py-2 text-xs text-ink/50">
        Reference only — the actual file is stored in the imaging system, not in ArogyaFlow.
      </p>

      {adding && (
        <div className="grid grid-cols-2 gap-2 border-b border-sand p-3 sm:grid-cols-5">
          <Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
            {ATTACHMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <Input className="sm:col-span-2" placeholder="Label, e.g. Pre-op OPG — tooth 26" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          <Input placeholder="Imaging system ref / URL" value={draft.externalRef} onChange={(e) => setDraft({ ...draft, externalRef: e.target.value })} />
          <Input type="date" value={draft.takenAt} onChange={(e) => setDraft({ ...draft, takenAt: e.target.value })} />
          <div className="col-span-2 flex gap-2 sm:col-span-5">
            <button className="btn-primary btn-sm" onClick={save}>Save</button>
            <button className="btn-outline btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {attachments.length === 0 ? (
        <p className="px-4 py-4 text-sm text-ink/40">No imaging or document references on file.</p>
      ) : (
        <ul className="divide-y divide-sand">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <span className="font-medium text-brand-900">{a.label}</span>
                <span className="ml-2 text-xs text-ink/40">{formatDate(a.takenAt)} · {a.uploadedBy}</span>
                {a.externalRef && <div className="text-xs text-ink/50">{a.externalRef}</div>}
              </div>
              <Badge tone="slate">{ATTACHMENT_TYPES.find((t) => t.value === a.type)?.label || a.type}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PlanCard({
  plan, patientId, canManage, dentalPricing, adding, onAddItem, onCancelAdd, onDoVerb, onSignConsent,
  orderSetOpen, onToggleOrderSet, onApplyOrderSet,
}) {
  const { state, repos } = useHospital()
  const toast = useToast()
  const [draft, setDraft] = useState({ tooth: '', priceId: dentalPricing[0]?.id || '', phase: '', estAmount: dentalPricing[0]?.amount || 0 })
  const [orderSetTooth, setOrderSetTooth] = useState('')

  const patient = state.patients.find((p) => p.id === patientId)

  // Auto-linked so a completed item can raise a follow-up task from
  // whatever next-visit plan the dentist noted on the consultation (§9.8) —
  // not user-selectable, kept simple like Nursing.jsx's doctor-instruction lookup.
  const latestConsultation = useMemo(
    () => [...state.consultations].filter((c) => c.patientId === patientId).sort((a, b) => b.date.localeCompare(a.date))[0] || null,
    [state.consultations, patientId]
  )

  const printConsent = (item) => {
    const price = dentalPricing.find((p) => p.id === item.priceId)
    const ok = printConsentForm({
      patient, procedureName: item.procedureName, tooth: item.tooth, priceCode: price?.code, lang: 'bilingual',
    })
    if (!ok) toast('Please allow pop-ups to print the consent form.', 'error')
  }

  const saveItem = () => {
    const price = dentalPricing.find((p) => p.id === draft.priceId)
    if (!price) { toast('Choose a procedure.', 'error'); return }
    const item = {
      id: uid('ppli'), tooth: draft.tooth || null, priceId: price.id, procedureName: price.name,
      phase: draft.phase.trim(), status: 'proposed', estAmount: Number(draft.estAmount) || price.amount,
      consultationId: latestConsultation?.id || null,
      acceptedAt: null, startedAt: null, completedAt: null, billableItemId: null,
    }
    repos.procedurePlans.update(plan.id, { items: [...plan.items, item], updatedAt: new Date().toISOString() })
    toast(`${price.name} added to the plan.`)
    setDraft({ tooth: '', priceId: dentalPricing[0]?.id || '', phase: '', estAmount: dentalPricing[0]?.amount || 0 })
    onCancelAdd()
  }

  return (
    <div className="rounded-lg border border-sand">
      <div className="flex items-center justify-between border-b border-sand bg-cream/40 px-3 py-2 text-xs text-ink/50">
        <span>Started {formatDate(plan.createdAt)} by {plan.createdBy}</span>
        <div className="flex items-center gap-2">
          <Badge tone={plan.consentStatus === 'signed' ? 'green' : 'gold'}>
            {plan.consentStatus === 'signed' ? `Consent signed · ${plan.consentSignedBy}` : 'Consent pending'}
          </Badge>
          {canManage && plan.consentStatus !== 'signed' && (
            <button className="btn-ghost btn-sm" onClick={() => onSignConsent(plan.id)}>Mark signed</button>
          )}
        </div>
      </div>

      {plan.items.length === 0 && !adding ? (
        <p className="px-3 py-4 text-sm text-ink/40">No items yet.</p>
      ) : plan.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-cream/30"><tr>
              <th className="th">Tooth</th><th className="th">Procedure</th><th className="th">Phase</th>
              <th className="th text-right">Est. amount</th><th className="th">Status</th><th className="th text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-sand">
              {plan.items.map((item) => (
                <tr key={item.id}>
                  <td className="td">{item.tooth || '—'}</td>
                  <td className="td">{item.procedureName}</td>
                  <td className="td text-ink/60">{item.phase || '—'}</td>
                  <td className="td text-right">{inr(item.estAmount)}</td>
                  <td className="td"><Badge status={item.status} /></td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      {canManage && item.status !== 'cancelled' && (
                        <button className="btn-ghost btn-sm" title="Print consent form" onClick={() => printConsent(item)}>
                          <FileSignature size={13} />
                        </button>
                      )}
                      {canManage && (ITEM_ACTIONS[item.status] || []).map(({ verb, label, icon: Icon }) => (
                        <button key={verb} className="btn-outline btn-sm" onClick={() => onDoVerb(verb, plan.id, item.id)}>
                          <Icon size={13} /> {label}
                        </button>
                      ))}
                      {canManage && ['proposed', 'accepted', 'in-progress'].includes(item.status) && (
                        <button className="btn-ghost btn-sm text-rose-600" title="Cancel item" onClick={() => onDoVerb('cancelItem', plan.id, item.id)}>
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManage && (adding ? (
        <div className="grid grid-cols-2 gap-2 border-t border-sand p-3 sm:grid-cols-5">
          <Select value={draft.tooth} onChange={(e) => setDraft({ ...draft, tooth: e.target.value })}>
            <option value="">Not tooth-specific</option>
            {ALL_FDI_TEETH.map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
          <Select
            className="sm:col-span-2"
            value={draft.priceId}
            onChange={(e) => {
              const price = dentalPricing.find((p) => p.id === e.target.value)
              setDraft({ ...draft, priceId: e.target.value, estAmount: price?.amount || 0 })
            }}
          >
            {dentalPricing.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <SmartField
            fieldKey="dentalPhase" departmentCode="DENT" recordId={plan.id}
            value={draft.phase} onChange={(e) => setDraft({ ...draft, phase: e.target.value })}
            placeholder="Phase (optional) — e.g. Access & Instrumentation"
          />
          <Input type="number" value={draft.estAmount} onChange={(e) => setDraft({ ...draft, estAmount: e.target.value })} />
          <div className="col-span-2 flex gap-2 sm:col-span-5">
            <button className="btn-primary btn-sm" onClick={saveItem}>Add item</button>
            <button className="btn-outline btn-sm" onClick={onCancelAdd}>Cancel</button>
          </div>
        </div>
      ) : orderSetOpen ? (
        <div className="flex flex-wrap items-end gap-2 border-t border-sand bg-gold-50/40 p-3">
          <div className="min-w-[220px] flex-1 text-xs text-ink/60">
            <p className="font-medium text-brand-900">{ORDER_SETS.rctToCrown.label}</p>
            <p className="mt-0.5">{ORDER_SETS.rctToCrown.description} Adds {ORDER_SETS.rctToCrown.items.length} items as <em>proposed</em> — nothing is billed until you accept, start and complete each one.</p>
          </div>
          <Select value={orderSetTooth} onChange={(e) => setOrderSetTooth(e.target.value)} className="w-auto">
            <option value="">Tooth…</option>
            {ALL_FDI_TEETH.map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
          <button
            className="btn-primary btn-sm"
            onClick={() => {
              if (!orderSetTooth) { toast('Pick the tooth this plan applies to.', 'error'); return }
              onApplyOrderSet(plan.id, 'rctToCrown', orderSetTooth, latestConsultation?.id)
              setOrderSetTooth('')
            }}
          >
            Apply
          </button>
          <button className="btn-outline btn-sm" onClick={onToggleOrderSet}>Cancel</button>
        </div>
      ) : (
        <div className="flex items-center gap-1 border-t border-sand p-2">
          <button className="btn-ghost btn-sm" onClick={onAddItem}><Plus size={14} /> Add item</button>
          {canManage && (
            <button className="btn-ghost btn-sm text-gold-700" onClick={onToggleOrderSet}>
              <Sparkles size={14} /> Use RCT order set
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
