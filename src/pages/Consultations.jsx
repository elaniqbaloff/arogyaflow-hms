import { useMemo, useState } from 'react'
import { Stethoscope, Plus, Pencil, FileText, Pill, Trash2, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react'
import { useHospital, useLookups } from '../store/HospitalContext'
import { useAuth } from '../store/AuthContext'
import { useToast } from '../components/ui/Toast'
import { Modal } from '../components/ui/Modal'
import {
  PageHeader, Badge, Field, Input, Select, Textarea, SearchInput, EmptyState,
} from '../components/ui/primitives'
import { SmartField } from '../components/ui/SmartField'
import { formatDate, today, uid, flagAbnormalVitals } from '../lib/utils'
import { AUDIT_SEVERITY } from '../services/workflow'
import {
  isAyurvedaDepartment, getMandatoryFields,
} from '../config/consultationTemplates'
import { scopeFilter } from '../services/accessPolicy'

export default function Consultations() {
  const { state, add, update, logAudit } = useHospital()
  const { patientName } = useLookups()
  const { user } = useAuth()
  const toast = useToast()

  const [tab, setTab] = useState('pending')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(null)
  const [rxFor, setRxFor] = useState(null)

  const list = useMemo(() => {
    return state.consultations
      .filter(scopeFilter(user, state, 'consultations'))
      .filter((c) => (tab === 'all' ? true : c.status === tab))
      .filter((c) => !query || patientName(c.patientId).toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [state, user, tab, query, patientName])

  const blank = {
    patientId: state.patients[0]?.id || '', doctorId: user.id, appointmentId: null, episodeId: null,
    date: today(), notes: '', diagnosis: '', treatment: '', status: 'pending',
    chiefComplaint: '',
    vitalsSnapshot: null,
    allergyConfirmed: false, allergyConfirmedBy: null, allergyConfirmedAt: null,
    followUpDate: '',
    referral: null,
    consentRequired: false, consentLinked: null,
    nadi: '', prakriti: '', vikriti: '', samprapti: '', samprapliGhataka: '', balaAssessment: '',
    chikitsaSutra: '', anupana: '',
    therapyAdvice: { procedures: [], notes: '' },
    pathyaApathya: { pathya: '', apathya: '' },
  }

  const departmentForPatient = (patientId) => {
    const patient = state.patients.find((p) => p.id === patientId)
    if (!patient) return null
    return state.departments?.find((dep) => dep.name === patient.department) || null
  }

  const validate = (d) => {
    const dept = departmentForPatient(d.patientId)
    const mandatory = getMandatoryFields(dept)
    const missing = []
    for (const key of mandatory) {
      if (key === 'allergyConfirmed') {
        if (!d.allergyConfirmed) missing.push('Allergy confirmation')
        continue
      }
      const val = d[key]
      if (val == null || (typeof val === 'string' && !val.trim())) {
        missing.push(key)
      }
    }
    return missing
  }

  const save = () => {
    const d = form.data
    if (!d.patientId) { toast('Select a patient.', 'error'); return }

    const missing = validate(d)
    if (missing.length > 0) {
      toast(`Please complete required fields: ${missing.join(', ')}`, 'error')
      return
    }

    if (form.mode === 'add') {
      add('consultations', d)
      logAudit({
        user, action: 'create', module: 'consultations', recordId: d.id || null,
        mrn: state.patients.find((p) => p.id === d.patientId)?.mrn,
        newValue: { diagnosis: d.diagnosis, treatment: d.treatment, status: d.status },
        remarks: 'Consultation created', severity: AUDIT_SEVERITY.info,
      })
      toast(`Consultation note added for ${patientName(d.patientId)}.`)
    } else {
      const before = state.consultations.find((c) => c.id === d.id)
      update('consultations', d.id, d)
      logAudit({
        user, action: 'update', module: 'consultations', recordId: d.id,
        mrn: state.patients.find((p) => p.id === d.patientId)?.mrn,
        oldValue: before ? { diagnosis: before.diagnosis, treatment: before.treatment, status: before.status } : null,
        newValue: { diagnosis: d.diagnosis, treatment: d.treatment, status: d.status },
        remarks: 'Consultation edited', severity: AUDIT_SEVERITY.notice,
      })
      toast('Consultation updated.')
    }
    setForm(null)
  }

  const complete = (c) => {
    update('consultations', c.id, { status: 'completed' })
    logAudit({
      user, action: 'update', module: 'consultations', recordId: c.id,
      mrn: state.patients.find((p) => p.id === c.patientId)?.mrn,
      oldValue: { status: c.status }, newValue: { status: 'completed' },
      remarks: 'Consultation marked complete', severity: AUDIT_SEVERITY.info,
    })
    toast(`Consultation for ${patientName(c.patientId)} marked complete.`)
  }

  const scopedConsultations = state.consultations.filter(scopeFilter(user, state, 'consultations'))
  const counts = {
    pending: scopedConsultations.filter((c) => c.status === 'pending').length,
    completed: scopedConsultations.filter((c) => c.status === 'completed').length,
  }

  return (
    <>
      <PageHeader
        title="Consultations"
        subtitle="Clinical notes, diagnoses & prescriptions"
        icon={Stethoscope}
        actions={<button className="btn-primary" onClick={() => setForm({ mode: 'add', data: { ...blank, id: uid('con') } })}><Plus size={18} /> New Consultation</button>}
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand p-4">
          <div className="flex gap-1 rounded-lg bg-sand/60 p-1">
            {['pending', 'completed', 'all'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${tab === t ? 'bg-white text-brand-800 shadow-sm' : 'text-ink/50 hover:text-ink/80'}`}
              >
                {t} {t !== 'all' && <span className="text-xs text-ink/40">({counts[t]})</span>}
              </button>
            ))}
          </div>
          <SearchInput value={query} onChange={setQuery} placeholder="Search patient…" />
        </div>

        {list.length === 0 ? (
          <EmptyState title="No consultations" message="Create a consultation note to get started." />
        ) : (
          <ul className="divide-y divide-sand">
            {list.map((c) => (
              <li key={c.id} className="p-5 hover:bg-cream/40">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-brand-900">{patientName(c.patientId)}</p>
                      <Badge status={c.status} />
                      <span className="text-xs text-ink/40">{formatDate(c.date)}</span>
                      {c.followUpDate && (
                        <span className="text-xs text-ink/40">· Follow-up: {formatDate(c.followUpDate)}</span>
                      )}
                    </div>
                    {c.chiefComplaint && <p className="mt-1 text-sm text-ink/70"><span className="font-medium text-ink/50">Chief complaint:</span> {c.chiefComplaint}</p>}
                    {c.diagnosis && <p className="mt-0.5 text-sm text-ink/70"><span className="font-medium text-ink/50">Diagnosis:</span> {c.diagnosis}</p>}
                    {c.notes && <p className="mt-0.5 text-sm text-ink/60">{c.notes}</p>}
                    {c.treatment && <p className="mt-0.5 text-sm text-ink/60"><span className="font-medium text-ink/50">Plan:</span> {c.treatment}</p>}
                    {c.pathyaApathya && (c.pathyaApathya.pathya || c.pathyaApathya.apathya) && (
                      <p className="mt-0.5 text-sm text-ink/60">
                        <span className="font-medium text-ink/50">Pathya/Apathya:</span> {c.pathyaApathya.pathya}
                        {c.pathyaApathya.apathya && <> · <span className="text-ink/50">Avoid:</span> {c.pathyaApathya.apathya}</>}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="btn-ghost btn-sm" onClick={() => setRxFor(c)} title="Add prescription"><Pill size={15} /></button>
                    <button className="btn-ghost btn-sm" onClick={() => setForm({ mode: 'edit', data: { ...blank, ...c } })} title="Edit"><Pencil size={15} /></button>
                    {c.status !== 'completed' && (
                      <button className="btn-ghost btn-sm text-brand-700" onClick={() => complete(c)} title="Mark complete"><CheckCircle2 size={15} /></button>
                    )}
                  </div>
                </div>
                <LinkedRx consultationId={c.id} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Consultation form */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.mode === 'add' ? 'New Consultation' : 'Edit Consultation'}
        subtitle="Record clinical findings"
        footer={<>
          <button className="btn-outline" onClick={() => setForm(null)}>Cancel</button>
          <button className="btn-primary" onClick={save}>Save Note</button>
        </>}
      >
        {form && (
          <ConsultationForm
            form={form}
            setForm={setForm}
            state={state}
            departmentForPatient={departmentForPatient}
          />
        )}
      </Modal>

      <PrescriptionModal consultation={rxFor} onClose={() => setRxFor(null)} />
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// Consultation form body — Ayurveda-first, with conditional
// Ayurveda block based on the patient's department type.
// ─────────────────────────────────────────────────────────────
function ConsultationForm({ form, setForm, state, departmentForPatient }) {
  const { state: hState } = useHospital()
  const { user } = useAuth()
  const { episodesFor } = useLookups()
  const d = form.data
  const patient = state.patients.find((p) => p.id === d.patientId)
  const department = departmentForPatient(d.patientId)
  const ayurveda = isAyurvedaDepartment(department)
  // Same scope a consultation record for this patient would be visible
  // under, applied to the picker so a doctor can't start a note for a
  // patient they wouldn't be allowed to see afterward.
  const pickablePatients = useMemo(
    () => state.patients.filter((p) => scopeFilter(user, state, 'consultations')({ patientId: p.id })),
    [state, user]
  )

  const setField = (key, value) => setForm({ ...form, data: { ...d, [key]: value } })
  const setNested = (key, subKey, value) => setForm({ ...form, data: { ...d, [key]: { ...(d[key] || {}), [subKey]: value } } })

  const latestVitals = useMemo(() => {
    if (d.vitalsSnapshot) return { ...d.vitalsSnapshot, source: 'consultation' }
    const episodeIds = episodesFor(d.patientId).map((e) => e.id)
    const recorded = (hState.vitals || [])
      .filter((v) => episodeIds.includes(v.episodeId) || v.patientId === d.patientId)
      .sort((a, b) => (b.recordedAt || b.date || '').localeCompare(a.recordedAt || a.date || ''))
    return recorded[0] ? { ...recorded[0], source: 'nursing' } : null
  }, [d.vitalsSnapshot, d.patientId, hState.vitals, episodesFor])

  const abnormalFlags = useMemo(() => flagAbnormalVitals(latestVitals), [latestVitals])

  const allergies = patient?.allergies || 'None'
  const hasAllergy = allergies && allergies.toLowerCase() !== 'none'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Patient" required>
          <Select value={d.patientId} onChange={(e) => setField('patientId', e.target.value)}>
            {pickablePatients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Date">
          <Input type="date" value={d.date} onChange={(e) => setField('date', e.target.value)} />
        </Field>
      </div>

      <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${hasAllergy ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-sand/40 text-ink/60'}`}>
        {hasAllergy ? <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-600" /> : <ShieldAlert size={18} className="mt-0.5 shrink-0 text-ink/30" />}
        <div className="flex-1">
          {hasAllergy ? (
            <>
              <p className="font-medium">Allergy on record: {allergies}</p>
              <label className="mt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!d.allergyConfirmed}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      data: {
                        ...d,
                        allergyConfirmed: e.target.checked,
                        allergyConfirmedBy: e.target.checked ? (d.allergyConfirmedBy || 'Current user') : null,
                        allergyConfirmedAt: e.target.checked ? new Date().toISOString() : null,
                      },
                    })
                  }}
                />
                <span>Confirmed reviewed before prescribing</span>
              </label>
            </>
          ) : (
            <p>No known allergies recorded.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-sand bg-cream/40 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-brand-900">Vitals</p>
          {latestVitals?.recordedAt || latestVitals?.date ? (
            <span className="text-xs text-ink/40">Last recorded: {formatDate(latestVitals.recordedAt || latestVitals.date)} ({latestVitals.source === 'nursing' ? 'Nursing' : 'Consultation'})</span>
          ) : (
            <span className="text-xs text-ink/40">No vitals on record — enter below</span>
          )}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {['bp', 'pulse', 'temp', 'rr', 'spo2', 'weight', 'height', 'bmi'].map((key) => (
            <Field key={key} label={key.toUpperCase()}>
              <Input
                value={(d.vitalsSnapshot?.[key] ?? latestVitals?.[key] ?? '')}
                onChange={(e) => setNested('vitalsSnapshot', key, e.target.value)}
                placeholder="—"
              />
            </Field>
          ))}
        </div>
        {abnormalFlags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {abnormalFlags.map((f) => (
              <span key={f} className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
                <AlertTriangle size={12} /> {f}
              </span>
            ))}
          </div>
        )}
      </div>

      <Field label="Chief complaint" required>
        <SmartField as={Textarea} fieldKey="chiefComplaint" departmentCode={department?.code} value={d.chiefComplaint} onChange={(e) => setField('chiefComplaint', e.target.value)} placeholder="Presenting symptoms in patient's words…" />
      </Field>
      <Field label="Diagnosis" required>
        <SmartField fieldKey="diagnosis" departmentCode={department?.code} value={d.diagnosis} onChange={(e) => setField('diagnosis', e.target.value)} placeholder="e.g. Lumbar spondylosis with sciatica" />
      </Field>
      <Field label="Consultation notes">
        <SmartField as={Textarea} fieldKey="notes" departmentCode={department?.code} value={d.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="History, examination, observations…" />
      </Field>
      <Field label="Treatment plan" required>
        <SmartField as={Textarea} fieldKey="treatment" departmentCode={department?.code} value={d.treatment} onChange={(e) => setField('treatment', e.target.value)} placeholder="Therapies, advice, follow-up…" />
      </Field>

      {ayurveda && (
        <div className="space-y-4 rounded-lg border border-brand-100 bg-brand-50/40 p-3">
          <p className="text-sm font-semibold text-brand-800">Ayurveda Assessment</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Prakriti" required>
              <Input value={d.prakriti} onChange={(e) => setField('prakriti', e.target.value)} placeholder="e.g. Vata-Pitta" />
            </Field>
            <Field label="Vikriti" required>
              <Input value={d.vikriti} onChange={(e) => setField('vikriti', e.target.value)} placeholder="e.g. Vata predominant" />
            </Field>
          </div>

          <Field label="Nadi">
            <Input value={d.nadi} onChange={(e) => setField('nadi', e.target.value)} placeholder="Pulse characteristics…" />
          </Field>

          <Field label="Samprapti (pathogenesis)" required>
            <Textarea value={d.samprapti} onChange={(e) => setField('samprapti', e.target.value)} placeholder="Disease process in Ayurvedic terms…" />
          </Field>

          <Field label="Samprapti Ghataka">
            <Textarea value={d.samprapliGhataka} onChange={(e) => setField('samprapliGhataka', e.target.value)} placeholder="Dosha, Dushya, Srotas, Agni, etc…" />
          </Field>

          <Field label="Bala assessment">
            <Input value={d.balaAssessment} onChange={(e) => setField('balaAssessment', e.target.value)} placeholder="Patient strength/fitness for procedures…" />
          </Field>

          <Field label="Chikitsa Sutra (treatment principle)" required>
            <SmartField as={Textarea} fieldKey="chikitsaSutra" departmentCode={department?.code} value={d.chikitsaSutra} onChange={(e) => setField('chikitsaSutra', e.target.value)} placeholder="Overall treatment principle…" />
          </Field>

          <Field label="Anupana">
            <Input value={d.anupana} onChange={(e) => setField('anupana', e.target.value)} placeholder="Vehicle/adjuvant for medicines…" />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Therapy / Panchakarma advice — procedures">
              <SmartField
                fieldKey="therapyAdvice"
                departmentCode={department?.code}
                value={(d.therapyAdvice?.procedures || []).join(', ')}
                onChange={(e) => setNested('therapyAdvice', 'procedures', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                placeholder="e.g. Abhyanga, Ela Kizhi, Kati Basti"
              />
            </Field>
            <Field label="Therapy advice — notes">
              <SmartField
                fieldKey="followUp"
                departmentCode={department?.code}
                value={d.therapyAdvice?.notes || ''}
                onChange={(e) => setNested('therapyAdvice', 'notes', e.target.value)}
                placeholder="Protocol notes…"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Pathya (advised)" required>
              <Textarea value={d.pathyaApathya?.pathya || ''} onChange={(e) => setNested('pathyaApathya', 'pathya', e.target.value)} placeholder="Diet/lifestyle advised…" />
            </Field>
            <Field label="Apathya (to avoid)" required>
              <Textarea value={d.pathyaApathya?.apathya || ''} onChange={(e) => setNested('pathyaApathya', 'apathya', e.target.value)} placeholder="Diet/lifestyle to avoid…" />
            </Field>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Follow-up / review date">
          <Input type="date" value={d.followUpDate || ''} onChange={(e) => setField('followUpDate', e.target.value)} />
        </Field>
        <Field label="Consent required for procedure?">
          <Select value={d.consentRequired ? 'yes' : 'no'} onChange={(e) => setField('consentRequired', e.target.value === 'yes')}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </Select>
        </Field>
      </div>

      <div className="rounded-lg border border-sand p-3">
        <p className="text-sm font-medium text-brand-900">Refer / order (optional)</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Select
            value={d.referral?.toDepartment || ''}
            onChange={(e) => setForm({ ...form, data: { ...d, referral: { ...(d.referral || {}), toDepartment: e.target.value || null } } })}
          >
            <option value="">No referral</option>
            {state.departments?.map((dep) => <option key={dep.id} value={dep.name}>{dep.name}</option>)}
          </Select>
          <Select
            value={d.referral?.toRole || ''}
            onChange={(e) => setForm({ ...form, data: { ...d, referral: { ...(d.referral || {}), toRole: e.target.value || null } } })}
          >
            <option value="">Role…</option>
            <option value="doctor">Doctor</option>
            <option value="nurse">Nurse</option>
            <option value="lab">Lab</option>
            <option value="pharmacy">Pharmacy</option>
          </Select>
          <Input
            placeholder="Reason"
            value={d.referral?.reason || ''}
            onChange={(e) => setForm({ ...form, data: { ...d, referral: { ...(d.referral || {}), reason: e.target.value } } })}
          />
        </div>
        <p className="mt-1 text-xs text-ink/40">Recorded for documentation only — does not yet create a task (planned for a future phase).</p>
      </div>
    </div>
  )
}

function LinkedRx({ consultationId }) {
  const { state } = useHospital()
  const rxs = state.prescriptions.filter((r) => r.consultationId === consultationId)
  if (rxs.length === 0) return null
  return (
    <div className="mt-3 rounded-lg bg-cream/70 p-3">
      {rxs.map((r) => (
        <div key={r.id} className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-ink/70">
            <FileText size={14} className="text-brand-500" />
            {r.items.map((i) => `${i.name} (${i.dosage})`).join(' · ')}
          </span>
          <Badge status={r.status} />
        </div>
      ))}
    </div>
  )
}

function PrescriptionModal({ consultation, onClose }) {
  const { state, add } = useHospital()
  const { patientName } = useLookups()
  const toast = useToast()
  const [items, setItems] = useState([{ medicineId: state.medicines[0]?.id, dosage: '', qty: 1 }])

  if (!consultation) return null

  const patient = state.patients.find((p) => p.id === consultation.patientId)
  const allergies = patient?.allergies || 'None'
  const hasAllergy = allergies && allergies.toLowerCase() !== 'none'
  const allergyOk = !hasAllergy || !!consultation.allergyConfirmed

  const addRow = () => setItems([...items, { medicineId: state.medicines[0]?.id, dosage: '', qty: 1 }])
  const removeRow = (i) => setItems(items.filter((_, idx) => idx !== i))
  const update = (i, key, val) => setItems(items.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)))

  const save = () => {
    if (!allergyOk) { toast('Confirm allergy review on the consultation before prescribing.', 'error'); return }
    const filled = items.filter((i) => i.medicineId && i.dosage.trim())
    if (filled.length === 0) { toast('Add at least one medicine with dosage.', 'error'); return }
    const withNames = filled.map((i) => ({
      ...i, qty: Number(i.qty) || 1,
      name: state.medicines.find((m) => m.id === i.medicineId)?.name || 'Medicine',
    }))
    add('prescriptions', {
      id: uid('rx'), patientId: consultation.patientId, consultationId: consultation.id,
      doctorId: consultation.doctorId, createdOn: today(), status: 'pending', items: withNames,
    })
    toast(`Prescription created for ${patientName(consultation.patientId)} — sent to pharmacy.`)
    setItems([{ medicineId: state.medicines[0]?.id, dosage: '', qty: 1 }])
    onClose()
  }

  return (
    <Modal
      open={!!consultation}
      onClose={onClose}
      title="Add Prescription"
      subtitle={`For ${patientName(consultation.patientId)} · routes to Pharmacy`}
      footer={<>
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={save} disabled={!allergyOk} title={!allergyOk ? 'Confirm allergy review on the consultation first' : ''}>Send to Pharmacy</button>
      </>}
    >
      <div className="space-y-3">
        {hasAllergy && !allergyOk && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900 border border-amber-200">
            <ShieldAlert size={16} className="text-amber-600" />
            Allergy ({allergies}) not yet confirmed on this consultation. Edit the consultation and confirm before prescribing.
          </div>
        )}
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <div className="col-span-5">
              <Select value={it.medicineId} onChange={(e) => update(i, 'medicineId', e.target.value)}>
                {state.medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </div>
            <div className="col-span-4">
              <Input placeholder="Dosage e.g. 1-0-1" value={it.dosage} onChange={(e) => update(i, 'dosage', e.target.value)} />
            </div>
            <div className="col-span-2">
              <Input type="number" min="1" value={it.qty} onChange={(e) => update(i, 'qty', e.target.value)} />
            </div>
            <div className="col-span-1 flex items-center justify-center">
              {items.length > 1 && (
                <button className="text-rose-500 hover:text-rose-700" onClick={() => removeRow(i)}><Trash2 size={16} /></button>
              )}
            </div>
          </div>
        ))}
        <button className="btn-ghost btn-sm" onClick={addRow}><Plus size={14} /> Add medicine</button>
      </div>
    </Modal>
  )
}
